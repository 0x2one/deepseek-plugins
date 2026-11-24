// Harness-free check of the agents-md-manager Host routes: imports the real
// module, drives its registered handlers with mock req/res, and asserts the
// observable results. Uses a throwaway DSH_HOME and project directory.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pluginDir = process.argv[2]
const moduleUrl = pathToFileURL(join(pluginDir, 'index.js')).href

const root = mkdtempSync(join(tmpdir(), 'am-test-'))
const home = join(root, 'home')
const project = join(root, 'proj')
mkdirSync(home, { recursive: true })
mkdirSync(project, { recursive: true })
process.env.DSH_HOME = home

const routes = new Map()
const registry = {
  list: () => [
    { id: 'ws-1', path: project, title: 'demo-project' },
    { id: 'ws-2', path: join(root, 'gone'), title: 'missing-project' },
  ],
}
const ctx = {
  effect: (fn) => { fn() },
  get: (name) => (name === 'workspaceRegistry' ? registry : undefined),
  logger: { warn: () => {} },
  connection: { requestRejection: () => undefined },
  webServer: {
    register: (route) => {
      routes.set(route.path, route.handler)
      return () => { routes.delete(route.path) }
    },
  },
}

const mod = await import(moduleUrl)
mod.apply(ctx)

function request(method, url, body) {
  const chunks = body === undefined ? [] : [Buffer.from(body, 'utf8')]
  return {
    method,
    url,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    async* [Symbol.asyncIterator]() { yield* chunks },
    resume() {},
  }
}

function response() {
  const res = {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value },
    end(text) { this.body = text ?? '' },
  }
  return res
}

async function call(path, method, url, body) {
  const handler = routes.get(path)
  if (handler === undefined) throw new Error(`no route ${path}`)
  const res = response()
  await handler(request(method, url, body), res)
  let json = null
  try { json = JSON.parse(res.body) } catch { json = null }
  return { status: res.statusCode, json }
}

const failures = []
function check(label, condition, detail) {
  if (condition) { console.log(`ok   ${label}`) } else { failures.push(label); console.log(`FAIL ${label}${detail === undefined ? '' : ' -> ' + JSON.stringify(detail)}`) }
}

// --- index -----------------------------------------------------------------
const index = await call('/agents-md/index', 'GET', '/agents-md/index')
check('index status 200', index.status === 200, index)
check('index global path', index.json?.global?.path === join(home, 'AGENTS.md'), index.json?.global?.path)
check('index global missing', index.json?.global?.exists === false)
check('index global display', index.json?.global?.displayPath === '$DSH_HOME/AGENTS.md', index.json?.global?.displayPath)
check('index lists two projects', index.json?.projects?.length === 2)
check('index project doc path', index.json?.projects?.[0]?.doc?.path === join(project, 'AGENTS.md'))
check('index project missing dir flagged', index.json?.projects?.[1]?.directoryExists === false)

// --- read a missing global doc --------------------------------------------
const emptyDoc = await call('/agents-md/doc', 'GET', '/agents-md/doc?scope=global')
check('doc status 200', emptyDoc.status === 200)
check('doc absent version', emptyDoc.json?.doc?.version === 'absent', emptyDoc.json?.doc?.version)
check('doc absent content empty', emptyDoc.json?.doc?.content === '')

// --- create the global doc -------------------------------------------------
const created = await call('/agents-md/save', 'POST', '/agents-md/save', JSON.stringify({
  scope: 'global', content: '# rules\nfirst line\n', expectedVersion: 'absent',
}))
check('save status 200', created.status === 200, created)
check('save wrote file', existsSync(join(home, 'AGENTS.md')))
check('save content matches', readFileSync(join(home, 'AGENTS.md'), 'utf8') === '# rules\nfirst line\n')
check('save reports exists', created.json?.doc?.exists === true)
const version1 = created.json?.doc?.version
check('save returns a sha1 version', typeof version1 === 'string' && version1.startsWith('sha1:'), version1)

// --- conflict --------------------------------------------------------------
const conflict = await call('/agents-md/save', 'POST', '/agents-md/save', JSON.stringify({
  scope: 'global', content: 'other', expectedVersion: 'absent',
}))
check('stale save is refused', conflict.status === 409, conflict)
check('conflict code', conflict.json?.error === 'conflict', conflict.json?.error)
check('conflict carries disk doc', conflict.json?.doc?.version === version1)
check('refused save left file alone', readFileSync(join(home, 'AGENTS.md'), 'utf8') === '# rules\nfirst line\n')

// --- force -----------------------------------------------------------------
const forced = await call('/agents-md/save', 'POST', '/agents-md/save', JSON.stringify({
  scope: 'global', content: 'forced', expectedVersion: 'absent', force: true,
}))
check('forced save accepted', forced.status === 200, forced)
check('forced save content', readFileSync(join(home, 'AGENTS.md'), 'utf8') === 'forced')

// --- project doc -----------------------------------------------------------
const projectSave = await call('/agents-md/save', 'POST', '/agents-md/save', JSON.stringify({
  scope: 'project', workspaceId: 'ws-1', content: 'project rules',
}))
check('project save 200', projectSave.status === 200, projectSave)
check('project file written', readFileSync(join(project, 'AGENTS.md'), 'utf8') === 'project rules')
check('project display path', projectSave.json?.doc?.displayPath === 'demo-project/AGENTS.md', projectSave.json?.doc?.displayPath)

const goneSave = await call('/agents-md/save', 'POST', '/agents-md/save', JSON.stringify({
  scope: 'project', workspaceId: 'ws-2', content: 'x',
}))
check('missing directory refused', goneSave.status === 409 && goneSave.json?.error === 'directory-missing', goneSave)
check('missing directory not created', !existsSync(join(root, 'gone')))

// --- refusals --------------------------------------------------------------
const unknown = await call('/agents-md/doc', 'GET', '/agents-md/doc?scope=project&workspaceId=nope')
check('unknown workspace 404', unknown.status === 404 && unknown.json?.error === 'unknown-workspace', unknown)

const tooBig = await call('/agents-md/save', 'POST', '/agents-md/save', JSON.stringify({
  scope: 'global', content: 'x'.repeat(2 * 1024 * 1024 + 1),
}))
check('oversize refused', tooBig.status === 413 && tooBig.json?.error === 'too-large', tooBig)

const wrongMethod = await call('/agents-md/index', 'POST', '/agents-md/index')
check('index rejects POST', wrongMethod.status === 405, wrongMethod)

// --- read back -------------------------------------------------------------
const readBack = await call('/agents-md/doc', 'GET', '/agents-md/doc?scope=project&workspaceId=ws-1')
check('read back project content', readBack.json?.doc?.content === 'project rules')
check('read back scope', readBack.json?.doc?.scope === 'project')
check('read back absolute path', readBack.json?.doc?.absolutePath === join(project, 'AGENTS.md'))

rmSync(root, { recursive: true, force: true })
console.log(failures.length === 0 ? 'ALL PASSED' : `FAILURES: ${failures.length}`)
process.exit(failures.length === 0 ? 0 : 1)
