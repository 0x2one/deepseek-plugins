/**
 * Host half of the agents-md-manager plugin: read and write the Harness rule
 * files for the Web UI.
 *
 * Two documents are managed, and nothing else is written:
 * - the global rules at `<dsh home>/AGENTS.md`, the file the Harness reads as
 *   `~/.dsh/AGENTS.md`;
 * - one project rules file at `<workspace directory>/AGENTS.md` for each
 *   Workspace the composition's workspace registry reports.
 *
 * Writes are UTF-8 and atomic (temporary file, then rename over the target), and
 * every save may name the version it was based on so a file changed elsewhere is
 * refused instead of silently overwritten.
 *
 * Every route asks the composition's `connection` service for a rejection first,
 * so the Host/Origin fence and the browser authentication gate apply before a
 * path is resolved or a byte is read.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, normalize } from 'node:path'

/** Cordis function-plugin name. */
export const name = 'agents-md-manager'

/** The route carrier and the trust fence guarding every route. */
export const inject = ['webServer', 'connection']

/** Route base; the client half fetches under it. */
const ROUTE_BASE = '/agents-md'

/** The managed file name inside the harness home and each project directory. */
const DOC_NAME = 'AGENTS.md'

/** One rule file above this size is refused, because the editor loads it whole. */
const MAX_DOC_BYTES = 2 * 1024 * 1024

/** A save body carries the file plus a JSON envelope; anything larger is hostile. */
const MAX_BODY_BYTES = 4 * 1024 * 1024

/** The version reported for a file that does not exist yet. */
const ABSENT_VERSION = 'absent'

/* -------------------------------------------------------------------- paths */

/**
 * The Harness home this installation reads: an explicit `$DSH_HOME` wins over
 * the default `~/.dsh`, and a blank value counts as unset.
 *
 * @returns the absolute home directory.
 */
function dshHome() {
  const configured = process.env.DSH_HOME
  if (typeof configured === 'string' && configured.trim() !== '') return normalize(configured.trim())
  return normalize(join(homedir(), '.dsh'))
}

/**
 * Render the Harness home the way the rest of the product does: the default
 * home displays as `~/.dsh`, and a configured one as `$DSH_HOME`, so a page
 * never prints a machine path it was not asked for.
 *
 * @param home - the resolved Harness home.
 * @returns the display form of that home.
 */
function homeDisplay(home) {
  const fallback = normalize(join(homedir(), '.dsh'))
  return home.toLowerCase() === fallback.toLowerCase() ? '~/.dsh' : '$DSH_HOME'
}

/**
 * Whether a path currently names a directory.
 *
 * @param target - absolute path to test.
 * @returns true when the path exists and is a directory.
 */
function isDirectory(target) {
  try {
    return statSync(target).isDirectory()
  } catch {
    return false
  }
}

/**
 * The content-identity of one document. Hashes are stable across machines and
 * timestamps, so a version compares a draft's base with what is on disk now.
 *
 * @param content - complete file text.
 * @returns the version string sent to the page.
 */
function versionOf(content) {
  return `sha1:${createHash('sha1').update(content, 'utf8').digest('hex')}`
}

/* --------------------------------------------------------------- document io */

/**
 * Read one rule file without throwing: a missing or unreadable file is reported
 * as state, not as a failed request.
 *
 * @param file - absolute path of the document.
 * @returns its existence, text, size, version, and last modification.
 */
function readDoc(file) {
  let info
  try {
    info = statSync(file)
  } catch {
    return { path: file, exists: false, readable: true, content: '', bytes: 0, version: ABSENT_VERSION, modifiedAt: null, tooLarge: false }
  }
  if (!info.isFile()) {
    return { path: file, exists: false, readable: false, content: '', bytes: 0, version: ABSENT_VERSION, modifiedAt: null, tooLarge: false }
  }
  if (info.size > MAX_DOC_BYTES) {
    return { path: file, exists: true, readable: false, content: '', bytes: info.size, version: `size:${info.size}`, modifiedAt: info.mtimeMs, tooLarge: true }
  }
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    // Existence is known but the bytes are not: the page shows this file as
    // unreadable and refuses to replace content it could not show.
    return { path: file, exists: true, readable: false, content: '', bytes: info.size, version: `unreadable:${info.size}`, modifiedAt: info.mtimeMs, tooLarge: false }
  }
  return { path: file, exists: true, readable: true, content, bytes: info.size, version: versionOf(content), modifiedAt: info.mtimeMs, tooLarge: false }
}

/**
 * Describe one document for the list, without reading its bytes.
 *
 * @param file - absolute path of the document.
 * @returns its existence, size, and last modification.
 */
function statDoc(file) {
  try {
    const info = statSync(file)
    return {
      path: file,
      exists: info.isFile(),
      bytes: info.isFile() ? info.size : 0,
      modifiedAt: info.mtimeMs,
      tooLarge: info.isFile() && info.size > MAX_DOC_BYTES,
    }
  } catch {
    return { path: file, exists: false, bytes: 0, modifiedAt: null, tooLarge: false }
  }
}

/**
 * Replace one document atomically: the new text lands in a sibling temporary
 * file that is renamed over the target, so a reader never sees a half-written
 * rule file and a failed write leaves the old one in place.
 *
 * @param file - absolute path of the document.
 * @param content - complete replacement text.
 */
function writeDoc(file, content) {
  mkdirSync(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now().toString(36)}.tmp`
  writeFileSync(temp, content, 'utf8')
  try {
    renameSync(temp, file)
  } catch (error) {
    try {
      unlinkSync(temp)
    } catch {
      /* the temporary file is already gone */
    }
    throw error
  }
}

/* ---------------------------------------------------------------- workspaces */

/**
 * The projects the page may edit: every Workspace the composition's registry
 * reports, in the registry's own order. A composition without a workspace
 * registry still serves the global rules.
 *
 * @param ctx - the plugin context, read for the optional registry.
 * @returns one entry per project with its directory and rules metadata.
 */
function projectEntries(ctx) {
  const registry = ctx.get('workspaceRegistry')
  if (registry === undefined || registry === null || typeof registry.list !== 'function') return []
  let rows
  try {
    rows = registry.list()
  } catch {
    return []
  }
  if (!Array.isArray(rows)) return []
  const entries = []
  for (const row of rows) {
    if (row === null || typeof row !== 'object') continue
    const directory = typeof row.path === 'string' ? row.path : ''
    if (directory === '') continue
    const id = String(row.id)
    const title = typeof row.title === 'string' && row.title.trim() !== '' ? row.title.trim() : basename(directory)
    entries.push({
      id,
      title,
      directory,
      directoryExists: isDirectory(directory),
      doc: statDoc(join(directory, DOC_NAME)),
    })
  }
  return entries
}

/**
 * Resolve the target document one request names, or the error code refusing it.
 *
 * @param ctx - the plugin context, read for the workspace registry.
 * @param scope - `'global'` or `'project'`.
 * @param workspaceId - the project's Workspace id, when the scope is a project.
 * @returns the target, or `{ error }` with a stable code.
 */
function resolveTarget(ctx, scope, workspaceId) {
  const home = dshHome()
  if (scope === 'global') {
    return {
      scope: 'global',
      path: join(home, DOC_NAME),
      directory: home,
      displayPath: `${homeDisplay(home)}/${DOC_NAME}`,
    }
  }
  if (scope !== 'project') return { error: 'invalid-scope' }
  if (typeof workspaceId !== 'string' || workspaceId === '') return { error: 'workspace-required' }
  const entry = projectEntries(ctx).find((candidate) => candidate.id === workspaceId)
  if (entry === undefined) return { error: 'unknown-workspace' }
  return {
    scope: 'project',
    workspaceId: entry.id,
    title: entry.title,
    path: join(entry.directory, DOC_NAME),
    directory: entry.directory,
    displayPath: `${entry.title}/${DOC_NAME}`,
  }
}

/**
 * The document payload the page reads: identity, text, and the version a later
 * save names. The absolute path rides along for the page's own footer.
 *
 * @param doc - the document as read from disk.
 * @param target - the resolved target it belongs to.
 * @returns the wire payload.
 */
function docPayload(doc, target) {
  return {
    scope: target.scope,
    workspaceId: target.workspaceId ?? null,
    title: target.title ?? null,
    path: doc.path,
    absolutePath: doc.path,
    directory: target.directory,
    displayPath: target.displayPath,
    exists: doc.exists,
    readable: doc.readable,
    tooLarge: doc.tooLarge,
    content: doc.content,
    bytes: doc.bytes,
    version: doc.version,
    modifiedAt: doc.modifiedAt,
    maxBytes: MAX_DOC_BYTES,
  }
}

/* ------------------------------------------------------------------- routes */

/**
 * Answer one request with JSON and no caching.
 *
 * @param res - the response to write.
 * @param status - HTTP status code.
 * @param payload - JSON-serializable body.
 */
function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Refuse a method this route does not own.
 *
 * @param res - the response to write.
 * @param allow - the methods this route accepts.
 */
function sendMethodNotAllowed(res, allow) {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.end()
}

/**
 * Collect a bounded request body as UTF-8 text.
 *
 * @param req - the request to drain.
 * @returns the body text, or null past the ceiling.
 */
async function readBoundedBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) {
      req.resume()
      return null
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, size).toString('utf8')
}

/**
 * Apply the composition's trust fence before a route touches state.
 *
 * @param ctx - the plugin context carrying `connection`.
 * @param req - the incoming request.
 * @param res - the response, written when the request is refused.
 * @returns true when the request was already answered.
 */
function rejected(ctx, req, res) {
  const rejection = ctx.connection.requestRejection(req)
  if (rejection === undefined) return false
  res.statusCode = rejection
  res.end()
  return true
}

/**
 * Register the index, document, and save routes, each behind the trust fence.
 *
 * @param ctx - the plugin context carrying `webServer` and `connection`.
 */
export function apply(ctx) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: `${ROUTE_BASE}/index`,
        handler: (req, res) => {
          if (rejected(ctx, req, res)) return
          if (req.method !== 'GET') {
            sendMethodNotAllowed(res, 'GET')
            return
          }
          const home = dshHome()
          sendJson(res, 200, {
            home: { path: home, display: homeDisplay(home) },
            global: {
              ...statDoc(join(home, DOC_NAME)),
              scope: 'global',
              displayPath: `${homeDisplay(home)}/${DOC_NAME}`,
            },
            projects: projectEntries(ctx),
            docName: DOC_NAME,
            maxBytes: MAX_DOC_BYTES,
          })
        },
      }),
    `agents-md-manager: GET ${ROUTE_BASE}/index`,
  )

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: `${ROUTE_BASE}/doc`,
        handler: (req, res) => {
          if (rejected(ctx, req, res)) return
          if (req.method !== 'GET') {
            sendMethodNotAllowed(res, 'GET')
            return
          }
          const url = new URL(req.url ?? '/', 'http://localhost')
          const target = resolveTarget(ctx, url.searchParams.get('scope'), url.searchParams.get('workspaceId') ?? '')
          if (target.error !== undefined) {
            sendJson(res, target.error === 'unknown-workspace' ? 404 : 400, { error: target.error })
            return
          }
          sendJson(res, 200, { doc: docPayload(readDoc(target.path), target) })
        },
      }),
    `agents-md-manager: GET ${ROUTE_BASE}/doc`,
  )

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: `${ROUTE_BASE}/save`,
        handler: async (req, res) => {
          if (rejected(ctx, req, res)) return
          if (req.method !== 'POST') {
            sendMethodNotAllowed(res, 'POST')
            return
          }
          const mediaType = String(req.headers['content-type'] ?? '').split(';', 1)[0]?.trim().toLowerCase()
          if (mediaType !== 'application/json') {
            sendJson(res, 415, { error: 'content-type-required' })
            return
          }
          const text = await readBoundedBody(req)
          if (text === null) {
            sendJson(res, 413, { error: 'body-too-large' })
            return
          }
          let body
          try {
            body = JSON.parse(text)
          } catch {
            sendJson(res, 400, { error: 'invalid-json' })
            return
          }
          if (body === null || typeof body !== 'object' || Array.isArray(body)) {
            sendJson(res, 400, { error: 'invalid-request' })
            return
          }
          const target = resolveTarget(ctx, body.scope, body.workspaceId ?? '')
          if (target.error !== undefined) {
            sendJson(res, target.error === 'unknown-workspace' ? 404 : 400, { error: target.error })
            return
          }
          if (typeof body.content !== 'string') {
            sendJson(res, 400, { error: 'invalid-content' })
            return
          }
          // Only an existing directory may receive a project file: a vanished
          // project must not recreate its folder behind the user's back.
          if (target.scope === 'project' && !isDirectory(target.directory)) {
            sendJson(res, 409, { error: 'directory-missing' })
            return
          }
          const bytes = Buffer.byteLength(body.content, 'utf8')
          if (bytes > MAX_DOC_BYTES) {
            sendJson(res, 413, { error: 'too-large', maxBytes: MAX_DOC_BYTES })
            return
          }
          if (body.force !== true) {
            const expected = typeof body.expectedVersion === 'string' ? body.expectedVersion : null
            const current = readDoc(target.path)
            if (expected !== null && current.version !== expected) {
              sendJson(res, 409, { error: 'conflict', doc: docPayload(current, target) })
              return
            }
          }
          try {
            writeDoc(target.path, body.content)
          } catch (error) {
            ctx.logger?.warn?.(`agents-md-manager: save failed for ${target.path}: ${error}`)
            sendJson(res, 500, { error: 'write-failed' })
            return
          }
          sendJson(res, 200, { doc: docPayload(readDoc(target.path), target) })
        },
      }),
    `agents-md-manager: POST ${ROUTE_BASE}/save`,
  )
}
