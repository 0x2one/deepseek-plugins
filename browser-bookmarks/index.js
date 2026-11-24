/**
 * Host half of the browser-bookmarks plugin: durable bookmark and category storage
 * under the Harness home, import of the installed browsers' own bookmark files, and
 * launching a URL either in the system default browser or in one chosen browser.
 *
 * The routes below are the whole browser-facing surface. Every one asks the
 * composition's `connection` service for a rejection first, so the Host/Origin fence
 * and the browser authentication gate apply before state is read or a process starts.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join, normalize } from 'node:path'

/** Cordis function-plugin name. */
export const name = 'browser-bookmarks'

/** The route carrier and the trust fence guarding every route. */
export const inject = ['webServer', 'connection']

/** Route base; the client half fetches under it. */
const ROUTE_BASE = '/browser-bookmarks'

/** Mutation bodies are small JSON objects; anything larger is hostile. */
const MAX_BODY_BYTES = 512 * 1024

/** Bounded import so a pathological browser file cannot exhaust the page. */
const MAX_IMPORT = 8000

/** Category names are one line of rail text; this is also the stored-name ceiling. */
const MAX_CATEGORY_NAME = 120

/** One multi-select delete may name at most this many bookmarks. */
const MAX_SELECTION = 5000

/** Safety snapshots kept next to the document, oldest pruned first. */
const MAX_SNAPSHOTS = 10

/** Declared shape version of the stored document. */
const STATE_VERSION = 1

/** Settings targets that are not a launchable browser executable. */
const SYSTEM_TARGET = 'system'
/** The Harness Web UI's own Browser tab, opened by the browser half, never by this process. */
const IN_APP_TARGET = 'in-app'

/** Scheme allowlist: a bookmark opens a web page, never a local handler. */
const WEB_SCHEMES = new Set(['http:', 'https:'])

const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

/* ------------------------------------------------------------------ storage */

/** The plugin's own durable directory, beside the other profile data. */
function storeDir() {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const dir = join(home, 'browser-bookmarks')
  mkdirSync(dir, { recursive: true })
  return dir
}

/** The one persisted document. */
function storeFile() {
  return join(storeDir(), 'bookmarks.json')
}

/** A fresh, empty document. */
function emptyState() {
  return {
    version: STATE_VERSION,
    categories: [],
    bookmarks: [],
    settings: { defaultBrowserId: 'system', defaultProfile: null },
    lastImport: null,
  }
}

/** Coerce one untrusted bookmark record into the stored shape, or null. */
function normalizeBookmark(value, categoryIds) {
  if (value === null || typeof value !== 'object') return null
  const url = typeof value.url === 'string' ? value.url.trim() : ''
  if (!isWebUrl(url)) return null
  const id = typeof value.id === 'string' && value.id !== '' ? value.id : newId()
  const title = typeof value.title === 'string' && value.title.trim() !== '' ? value.title.trim().slice(0, 300) : url
  return {
    id,
    title,
    url,
    categoryId: categoryIds.has(value.categoryId) ? value.categoryId : null,
    starred: value.starred === true,
    order: Number.isFinite(value.order) ? value.order : 0,
    addedAt: Number.isFinite(value.addedAt) ? value.addedAt : Date.now(),
  }
}

/** Coerce one untrusted category record into the stored shape, or null. */
function normalizeCategory(value) {
  if (value === null || typeof value !== 'object') return null
  const categoryName = typeof value.name === 'string' ? value.name.trim().slice(0, MAX_CATEGORY_NAME) : ''
  if (categoryName === '') return null
  return {
    id: typeof value.id === 'string' && value.id !== '' ? value.id : newId(),
    name: categoryName,
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : Date.now(),
  }
}

/** Build a validated document from any parsed JSON value. */
function normalizeState(value) {
  const state = emptyState()
  if (value === null || typeof value !== 'object') return state

  const seenCategories = new Set()
  for (const raw of Array.isArray(value.categories) ? value.categories : []) {
    const category = normalizeCategory(raw)
    if (category === null || seenCategories.has(category.id)) continue
    seenCategories.add(category.id)
    state.categories.push(category)
  }

  const seenBookmarks = new Set()
  for (const raw of Array.isArray(value.bookmarks) ? value.bookmarks : []) {
    const bookmark = normalizeBookmark(raw, seenCategories)
    if (bookmark === null || seenBookmarks.has(bookmark.id)) continue
    seenBookmarks.add(bookmark.id)
    state.bookmarks.push(bookmark)
  }

  const settings = value.settings
  if (settings !== null && typeof settings === 'object') {
    if (typeof settings.defaultBrowserId === 'string') state.settings.defaultBrowserId = settings.defaultBrowserId
    if (typeof settings.defaultProfile === 'string' && settings.defaultProfile !== '') {
      state.settings.defaultProfile = settings.defaultProfile.slice(0, 120)
    }
  }
  const lastImport = value.lastImport
  if (lastImport !== null && typeof lastImport === 'object' && Number.isFinite(lastImport.at)) {
    state.lastImport = {
      at: lastImport.at,
      browser: typeof lastImport.browser === 'string' ? lastImport.browser : '',
      profile: typeof lastImport.profile === 'string' ? lastImport.profile : '',
      added: Number.isFinite(lastImport.added) ? lastImport.added : 0,
      skipped: Number.isFinite(lastImport.skipped) ? lastImport.skipped : 0,
    }
  }
  return state
}

/** Read the persisted document; a missing or damaged file reads as empty. */
function loadState() {
  try {
    return normalizeState(JSON.parse(readFileSync(storeFile(), 'utf8')))
  } catch {
    return emptyState()
  }
}

/** Write the document durably (temp file, then rename over the target). */
function saveState(state) {
  const file = storeFile()
  const temp = `${file}.${process.pid}.tmp`
  writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  renameSync(temp, file)
}

/**
 * Keep the document as it stands before something replaces it, and prune the oldest
 * snapshots. A safety net that fails must never block the operation it protects.
 *
 * @returns the snapshot path, or null when it could not be written.
 */
function writeSnapshot(state) {
  try {
    const dir = join(storeDir(), 'backups')
    mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = join(dir, `bookmarks-${stamp}.json`)
    writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    const files = readdirSync(dir)
      .filter((name) => name.startsWith('bookmarks-') && name.endsWith('.json'))
      .sort()
    for (const name of files.slice(0, Math.max(0, files.length - MAX_SNAPSHOTS))) {
      rmSync(join(dir, name), { force: true })
    }
    return file
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------- urls */

/** A new opaque id for a bookmark or category. */
function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Parse a candidate URL and require an http(s) scheme. */
function parseWebUrl(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (text === '') return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`
  try {
    const url = new URL(withScheme)
    return WEB_SCHEMES.has(url.protocol) ? url : null
  } catch {
    return null
  }
}

/** Whether a candidate URL is one this plugin will store and open. */
function isWebUrl(value) {
  return parseWebUrl(value) !== null
}

/* ---------------------------------------------------------------- browsers */

/**
 * The browsers this host can launch and import from. `exe` entries are absolute
 * paths or bare command names resolved on PATH; `profiles` are the per-profile
 * parent directories that hold a Chromium-style `Bookmarks` file.
 */
const BROWSERS = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    /* Chromium browsers open one named user profile with `--profile-directory`. */
    profileSwitch: true,
    exe: {
      win32: [
        '%LOCALAPPDATA%/Google/Chrome/Application/chrome.exe',
        '%PROGRAMFILES%/Google/Chrome/Application/chrome.exe',
        '%PROGRAMFILES(X86)%/Google/Chrome/Application/chrome.exe',
      ],
      darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
      linux: ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'],
    },
    profiles: {
      win32: ['%LOCALAPPDATA%/Google/Chrome/User Data'],
      darwin: ['~/Library/Application Support/Google/Chrome'],
      linux: ['~/.config/google-chrome', '~/.config/chromium'],
    },
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    profileSwitch: true,
    exe: {
      win32: [
        '%PROGRAMFILES(X86)%/Microsoft/Edge/Application/msedge.exe',
        '%PROGRAMFILES%/Microsoft/Edge/Application/msedge.exe',
        '%LOCALAPPDATA%/Microsoft/Edge/Application/msedge.exe',
      ],
      darwin: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
      linux: ['microsoft-edge', 'microsoft-edge-stable'],
    },
    profiles: {
      win32: ['%LOCALAPPDATA%/Microsoft/Edge/User Data'],
      darwin: ['~/Library/Application Support/Microsoft Edge'],
      linux: ['~/.config/microsoft-edge'],
    },
  },
  {
    id: 'brave',
    name: 'Brave',
    profileSwitch: true,
    exe: {
      win32: [
        '%LOCALAPPDATA%/BraveSoftware/Brave-Browser/Application/brave.exe',
        '%PROGRAMFILES%/BraveSoftware/Brave-Browser/Application/brave.exe',
      ],
      darwin: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
      linux: ['brave-browser', 'brave'],
    },
    profiles: {
      win32: ['%LOCALAPPDATA%/BraveSoftware/Brave-Browser/User Data'],
      darwin: ['~/Library/Application Support/BraveSoftware/Brave-Browser'],
      linux: ['~/.config/BraveSoftware/Brave-Browser'],
    },
  },
  {
    id: 'vivaldi',
    name: 'Vivaldi',
    profileSwitch: true,
    exe: {
      win32: [
        '%LOCALAPPDATA%/Vivaldi/Application/vivaldi.exe',
        '%PROGRAMFILES%/Vivaldi/Application/vivaldi.exe',
      ],
      darwin: ['/Applications/Vivaldi.app/Contents/MacOS/Vivaldi'],
      linux: ['vivaldi', 'vivaldi-stable'],
    },
    profiles: {
      win32: ['%LOCALAPPDATA%/Vivaldi/User Data'],
      darwin: ['~/Library/Application Support/Vivaldi'],
      linux: ['~/.config/vivaldi'],
    },
  },
  {
    id: 'opera',
    name: 'Opera',
    exe: {
      win32: [
        '%APPDATA%/Opera Software/Opera Stable/opera.exe',
        '%LOCALAPPDATA%/Programs/Opera/opera.exe',
        '%PROGRAMFILES%/Opera/opera.exe',
      ],
      darwin: ['/Applications/Opera.app/Contents/MacOS/Opera'],
      linux: ['opera'],
    },
    profiles: {
      win32: ['%APPDATA%/Opera Software/Opera Stable'],
      darwin: ['~/Library/Application Support/com.operasoftware.Opera'],
      linux: ['~/.config/opera'],
    },
  },
  {
    id: 'firefox',
    name: 'Mozilla Firefox',
    exe: {
      win32: [
        '%PROGRAMFILES%/Mozilla Firefox/firefox.exe',
        '%PROGRAMFILES(X86)%/Mozilla Firefox/firefox.exe',
      ],
      darwin: ['/Applications/Firefox.app/Contents/MacOS/firefox'],
      linux: ['firefox'],
    },
    // Firefox keeps bookmarks in places.sqlite, which needs a SQLite reader this
    // plugin does not carry; it is a launch target only.
    profiles: {},
  },
]

/** Expand `%VAR%` and a leading `~` in a configured path, in the platform's own spelling. */
function expandPath(value) {
  let text = value.replace(/%([^%]+)%/g, (match, envName) => process.env[envName] ?? match)
  if (text === '~' || text.startsWith('~/') || text.startsWith('~\\')) text = join(homedir(), text.slice(1))
  return normalize(text)
}

/** Resolve a bare command name against PATH. */
function which(command) {
  const pathValue = process.env.PATH ?? process.env.Path ?? ''
  for (const dir of pathValue.split(delimiter)) {
    if (dir === '') continue
    const candidate = join(dir, command)
    if (isFile(candidate)) return candidate
  }
  return null
}

function isFile(target) {
  try {
    return statSync(target).isFile()
  } catch {
    return false
  }
}

function isDir(target) {
  try {
    return statSync(target).isDirectory()
  } catch {
    return false
  }
}

/** The verified executable for one browser, or null. */
function browserExecutable(entry) {
  const candidates = entry.exe[process.platform] ?? []
  for (const candidate of candidates) {
    if (candidate.includes('/') || candidate.includes('\\')) {
      const resolved = expandPath(candidate)
      if (isFile(resolved)) return resolved
      continue
    }
    const onPath = which(candidate)
    if (onPath !== null) return onPath
  }
  return null
}

/** The launch/import capability view the browser asks for, one entry per user profile. */
function browserCatalog() {
  const scanned = scanBrowsers()
  return BROWSERS.map((entry) => ({
    id: entry.id,
    name: entry.name,
    available: browserExecutable(entry) !== null,
    profiles: (scanned.get(entry.id) ?? []).map((profile) => ({
      dir: profile.dir,
      name: profile.name,
      account: profile.account,
    })),
  }))
}

/** Profile scans are cheap but not free; one request cycle reuses one scan. */
let scanCache = { at: 0, profiles: null }

/** Every configured browser's user profiles, re-read at most once per short window. */
function scanBrowsers() {
  const now = Date.now()
  if (scanCache.profiles !== null && now - scanCache.at < 2000) return scanCache.profiles
  const profiles = new Map()
  for (const entry of BROWSERS) profiles.set(entry.id, detectProfiles(entry))
  scanCache = { at: now, profiles }
  return profiles
}

/**
 * Read a Chromium `Local State` profile table: directory name to the display name and
 * signed-in account the user set for that profile.
 */
function readProfileInfo(root) {
  const table = new Map()
  try {
    const localState = JSON.parse(readFileSync(join(root, 'Local State'), 'utf8'))
    const infoCache = localState !== null && typeof localState === 'object' ? localState.profile?.info_cache : null
    if (infoCache === null || typeof infoCache !== 'object') return table
    for (const [dir, info] of Object.entries(infoCache)) {
      if (info === null || typeof info !== 'object') continue
      const name = typeof info.name === 'string' && info.name.trim() !== '' ? info.name.trim() : dir
      const account = typeof info.user_name === 'string' && info.user_name.trim() !== '' ? info.user_name.trim() : ''
      table.set(dir, { name, account })
    }
  } catch {
    /* a browser that never started, or a locked file: the directory names still work */
  }
  return table
}

/**
 * One browser's user profiles: the directory that holds the profile, the name it was
 * given, the account signed into it, and its bookmark file when it has one.
 */
function detectProfiles(entry) {
  const roots = (entry.profiles[process.platform] ?? []).map(expandPath)
  const profiles = []
  const seen = new Set()
  for (const root of roots) {
    if (!isDir(root)) continue
    const info = readProfileInfo(root)
    const push = (dir) => {
      const key = `${root}\u0000${dir}`
      if (seen.has(key)) return
      seen.add(key)
      const meta = info.get(dir)
      const file = join(root, dir, 'Bookmarks')
      profiles.push({
        dir,
        name: meta?.name ?? (dir === '' ? lastSegment(root) : dir),
        account: meta?.account ?? '',
        file: isFile(file) ? file : null,
      })
    }
    // A profile root that itself holds the browser's files (Opera) is one profile.
    if (isFile(join(root, 'Bookmarks')) || isFile(join(root, 'Preferences'))) push('')
    for (const dir of info.keys()) push(dir)
    let children = []
    try {
      children = readdirSync(root, { withFileTypes: true })
    } catch {
      children = []
    }
    for (const child of children) {
      if (!child.isDirectory()) continue
      if (isFile(join(root, child.name, 'Preferences')) || isFile(join(root, child.name, 'Bookmarks'))) push(child.name)
    }
  }
  return profiles
}

/** Every profile bookmark file this host can read, grouped by browser. */
function detectSources() {
  const scanned = scanBrowsers()
  const sources = []
  for (const entry of BROWSERS) {
    for (const profile of scanned.get(entry.id) ?? []) {
      if (profile.file === null) continue
      let modifiedAt = 0
      let size = 0
      try {
        const info = statSync(profile.file)
        modifiedAt = info.mtimeMs
        size = info.size
      } catch {
        continue
      }
      sources.push({
        id: `${entry.id}|${profile.dir}`,
        browserId: entry.id,
        browser: entry.name,
        profile: profile.dir,
        profileName: profile.name,
        account: profile.account,
        file: profile.file,
        modifiedAt,
        size,
      })
    }
  }
  // Group by browser, keeping each browser's own profile order (a stable sort).
  return sources.sort((left, right) => (left.browserId < right.browserId ? -1 : left.browserId > right.browserId ? 1 : 0))
}

/** The import sources as the page needs them, without host paths. */
function importSources() {
  return detectSources().map(({ file, ...rest }) => rest)
}

function lastSegment(value) {
  const parts = value.split(/[\\/]/).filter((part) => part !== '')
  return parts.length === 0 ? value : parts[parts.length - 1]
}

/* ------------------------------------------------------------------ import */

/** Walk one Chromium node tree, collecting page entries with their folder trail. */
function walkChromiumNode(node, trail, out) {
  if (node === null || typeof node !== 'object') return
  if (node.type === 'url' && typeof node.url === 'string') {
    if (isWebUrl(node.url)) {
      out.push({
        title: typeof node.name === 'string' && node.name.trim() !== '' ? node.name.trim() : node.url,
        url: new URL(/^[a-z][a-z0-9+.-]*:/i.test(node.url) ? node.url : `https://${node.url}`).href,
        trail,
      })
    }
    return
  }
  const children = Array.isArray(node.children) ? node.children : []
  const nextTrail = typeof node.name === 'string' && node.name.trim() !== '' ? [...trail, node.name.trim()] : trail
  for (const child of children) walkChromiumNode(child, nextTrail, out)
}

/** Read one Chromium `Bookmarks` document into flat page entries. */
function readChromiumBookmarks(file) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'))
  const roots = parsed !== null && typeof parsed === 'object' ? parsed.roots : null
  if (roots === null || typeof roots !== 'object') throw new Error('unreadable-bookmarks-file')
  const pages = []
  for (const rootNode of Object.values(roots)) {
    if (rootNode === null || typeof rootNode !== 'object') continue
    const children = Array.isArray(rootNode.children) ? rootNode.children : []
    for (const child of children) walkChromiumNode(child, [], pages)
    if (pages.length >= MAX_IMPORT) break
  }
  return pages.slice(0, MAX_IMPORT)
}

/**
 * Merge one browser's pages into the document: an existing URL is skipped, a
 * folder trail becomes (or reuses) one category named by that trail.
 *
 * @returns counts for the notice the page shows.
 */
function importPages(state, pages, source) {
  const knownUrls = new Set(state.bookmarks.map((bookmark) => bookmark.url))
  const categoriesByName = new Map(state.categories.map((category) => [category.name, category]))
  let added = 0
  let skipped = 0
  let categoriesCreated = 0
  let order = state.bookmarks.length

  for (const page of pages) {
    if (knownUrls.has(page.url)) {
      skipped += 1
      continue
    }
    let categoryId = null
    // The stored name is the lookup key, so truncation happens before both.
    const trail = page.trail.slice(0, 3).join(' / ').trim().slice(0, MAX_CATEGORY_NAME).trim()
    if (trail !== '') {
      const existing = categoriesByName.get(trail)
      if (existing !== undefined) {
        categoryId = existing.id
      } else {
        const created = { id: newId(), name: trail, createdAt: Date.now() }
        state.categories.push(created)
        categoriesByName.set(trail, created)
        categoriesCreated += 1
        categoryId = created.id
      }
    }
    state.bookmarks.push({
      id: newId(),
      title: page.title.slice(0, 300),
      url: page.url,
      categoryId,
      order,
      addedAt: Date.now(),
    })
    order += 1
    knownUrls.add(page.url)
    added += 1
  }

  state.lastImport = {
    at: Date.now(),
    browser: source.browser,
    profile: source.profile,
    added,
    skipped,
  }
  return { added, skipped, categoriesCreated, total: pages.length }
}

/* ------------------------------------------------------------------ launch */

/** Start one detached process that must outlive this request. */
function spawnDetached(command, args) {
  let child
  try {
    child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true })
  } catch {
    /* a launcher that cannot even start hands the failure back to the caller */
    throw new ActionError('launch-failed')
  }
  child.on('error', () => {
    /* already answered; a launcher that dies this early surfaces as no window */
  })
  child.unref()
}

/**
 * The command one launch runs: the browser executable, its profile switch when the
 * browser has one and a profile was named, and the URL last.
 */
export function launchArgs(browserId, profileDir, url) {
  const entry = BROWSERS.find((candidate) => candidate.id === browserId)
  if (entry === undefined) throw new ActionError('unknown-browser')
  const executable = browserExecutable(entry)
  if (executable === null) throw new ActionError('browser-unavailable')
  const args = []
  if (typeof profileDir === 'string' && profileDir !== '' && entry.profileSwitch === true) {
    args.push(`--profile-directory=${profileDir}`)
  }
  args.push(url)
  return { executable, args }
}

/**
 * The shell-free command that hands a URL to the system default browser. No command
 * shell sits in between, so `&`, `^`, `|`, or `%` inside a bookmark URL stay part of the
 * address instead of being parsed as further commands — `cmd /c start` splits on `&`.
 */
function systemLaunchCommand(url) {
  if (isWindows) return { command: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] }
  if (isMac) return { command: 'open', args: [url] }
  return { command: 'xdg-open', args: [url] }
}

/** Open one URL in the chosen browser (and user profile), or in the system default one. */
function launchUrl(url, browserId, profileDir) {
  const target = browserId === undefined || browserId === '' ? SYSTEM_TARGET : browserId
  if (target !== SYSTEM_TARGET) {
    const { executable, args } = launchArgs(target, profileDir, url)
    spawnDetached(executable, args)
    return
  }
  const { command, args } = systemLaunchCommand(url)
  spawnDetached(command, args)
}

/* ----------------------------------------------------------------- actions */

/** A refused action: the message reaches the page as the failure text. */
class ActionError extends Error {}

/** Require a non-empty trimmed string field. */
function requireText(value, code, max = 400) {
  if (typeof value !== 'string' || value.trim() === '') throw new ActionError(code)
  return value.trim().slice(0, max)
}

/** Resolve a category id from a payload, where null and '' both mean uncategorized. */
function readCategoryId(state, value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new ActionError('invalid-category')
  return state.categories.some((category) => category.id === value) ? value : null
}

/** Find one bookmark or refuse the action. */
function findBookmark(state, id) {
  const bookmark = state.bookmarks.find((candidate) => candidate.id === id)
  if (bookmark === undefined) throw new ActionError('bookmark-not-found')
  return bookmark
}

/** The id set one multi-bookmark action names, deduplicated and bounded. */
function readSelection(value) {
  if (!Array.isArray(value) || value.length === 0) throw new ActionError('invalid-selection')
  if (value.length > MAX_SELECTION) throw new ActionError('invalid-selection')
  const ids = new Set()
  for (const id of value) {
    if (typeof id !== 'string' || id === '') throw new ActionError('invalid-selection')
    ids.add(id)
  }
  return ids
}

/** The title a bookmark falls back to: the site it points at. */
function defaultTitle(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url.slice(0, 300)
  }
}

/**
 * The one mutation table: each entry edits the document in place and may return a
 * notice for the page. Launching a URL is the only entry with no document change.
 */
const ACTIONS = {
  'bookmark/add'(state, payload) {
    const url = parseWebUrl(requireText(payload.url, 'url-required', 2000))
    if (url === null) throw new ActionError('invalid-url')
    const title = typeof payload.title === 'string' && payload.title.trim() !== '' ? payload.title.trim().slice(0, 300) : defaultTitle(url.href)
    const bookmark = {
      id: newId(),
      title,
      url: url.href,
      categoryId: readCategoryId(state, payload.categoryId),
      starred: payload.starred === true,
      order: state.bookmarks.length,
      addedAt: Date.now(),
    }
    state.bookmarks.push(bookmark)
    return { bookmarkId: bookmark.id }
  },

  'bookmark/update'(state, payload) {
    const bookmark = findBookmark(state, requireText(payload.id, 'bookmark-required'))
    if (payload.url !== undefined) {
      const url = parseWebUrl(requireText(payload.url, 'url-required', 2000))
      if (url === null) throw new ActionError('invalid-url')
      bookmark.url = url.href
    }
    if (payload.title !== undefined) {
      const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 300) : ''
      bookmark.title = title !== '' ? title : defaultTitle(bookmark.url)
    }
    if (payload.categoryId !== undefined) bookmark.categoryId = readCategoryId(state, payload.categoryId)
    return {}
  },

  'bookmark/star'(state, payload) {
    const bookmark = findBookmark(state, requireText(payload.id, 'bookmark-required'))
    bookmark.starred = payload.starred === true
    return {}
  },

  'bookmark/starMany'(state, payload) {
    const wanted = readSelection(payload.ids)
    const starred = payload.starred === true
    let updated = 0
    for (const bookmark of state.bookmarks) {
      if (!wanted.has(bookmark.id) || bookmark.starred === starred) continue
      bookmark.starred = starred
      updated += 1
    }
    if (updated === 0 && !state.bookmarks.some((bookmark) => wanted.has(bookmark.id))) {
      throw new ActionError('bookmark-not-found')
    }
    return { updated }
  },

  'bookmark/remove'(state, payload) {
    const id = requireText(payload.id, 'bookmark-required')
    const before = state.bookmarks.length
    state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.id !== id)
    if (state.bookmarks.length === before) throw new ActionError('bookmark-not-found')
    return {}
  },

  'bookmark/removeMany'(state, payload) {
    const wanted = readSelection(payload.ids)
    const before = state.bookmarks.length
    state.bookmarks = state.bookmarks.filter((bookmark) => !wanted.has(bookmark.id))
    const removed = before - state.bookmarks.length
    if (removed === 0) throw new ActionError('bookmark-not-found')
    return { removed }
  },

  'bookmark/moveMany'(state, payload) {
    const wanted = readSelection(payload.ids)
    // A move names its destination explicitly: an unknown id must not silently
    // become "uncategorized", so only an empty value means that.
    const wantedCategory = payload.categoryId === undefined || payload.categoryId === null || payload.categoryId === '' ? null : payload.categoryId
    if (wantedCategory !== null && !state.categories.some((category) => category.id === wantedCategory)) {
      throw new ActionError('category-not-found')
    }
    let moved = 0
    for (const bookmark of state.bookmarks) {
      if (!wanted.has(bookmark.id) || bookmark.categoryId === wantedCategory) continue
      bookmark.categoryId = wantedCategory
      moved += 1
    }
    if (moved === 0 && !state.bookmarks.some((bookmark) => wanted.has(bookmark.id))) {
      throw new ActionError('bookmark-not-found')
    }
    return { moved, categoryId: wantedCategory }
  },

  'bookmark/reorder'(state, payload) {
    const id = requireText(payload.id, 'bookmark-required')
    const targetId = requireText(payload.targetId, 'target-required')
    if (id === targetId) throw new ActionError('invalid-order')
    const from = state.bookmarks.findIndex((bookmark) => bookmark.id === id)
    if (from < 0 || !state.bookmarks.some((bookmark) => bookmark.id === targetId)) {
      throw new ActionError('bookmark-not-found')
    }
    // A relative move: place the bookmark beside its neighbour, which keeps a drag inside
    // a filtered grid meaningful without shipping the whole order back and forth.
    const [moved] = state.bookmarks.splice(from, 1)
    const targetIndex = state.bookmarks.findIndex((bookmark) => bookmark.id === targetId)
    state.bookmarks.splice(payload.after === true ? targetIndex + 1 : targetIndex, 0, moved)
    state.bookmarks.forEach((bookmark, index) => {
      bookmark.order = index
    })
    return { position: state.bookmarks.findIndex((bookmark) => bookmark.id === id) }
  },

  'backup/restore'(state, payload) {
    const source = payload.document
    if (source === null || typeof source !== 'object') throw new ActionError('invalid-backup')
    if (!Array.isArray(source.bookmarks) || !Array.isArray(source.categories)) throw new ActionError('invalid-backup')
    const restored = normalizeState(source)
    // A file that names bookmarks but yields none is malformed, not empty: refusing it
    // keeps a bad backup from wiping a library the user just confirmed overwriting.
    if (source.bookmarks.length > 0 && restored.bookmarks.length === 0) throw new ActionError('invalid-backup')
    const backupPath = writeSnapshot(state)
    state.version = restored.version
    state.categories = restored.categories
    state.bookmarks = restored.bookmarks
    state.settings = restored.settings
    state.lastImport = restored.lastImport
    return {
      restored: { bookmarks: restored.bookmarks.length, categories: restored.categories.length },
      backupPath,
    }
  },

  'category/add'(state, payload) {
    const categoryName = requireText(payload.name, 'name-required', MAX_CATEGORY_NAME)
    if (state.categories.some((category) => category.name === categoryName)) throw new ActionError('category-exists')
    const category = { id: newId(), name: categoryName, createdAt: Date.now() }
    state.categories.push(category)
    return { categoryId: category.id }
  },

  'category/rename'(state, payload) {
    const id = requireText(payload.id, 'category-required')
    const category = state.categories.find((candidate) => candidate.id === id)
    if (category === undefined) throw new ActionError('category-not-found')
    const categoryName = requireText(payload.name, 'name-required', MAX_CATEGORY_NAME)
    if (state.categories.some((other) => other.id !== id && other.name === categoryName)) {
      throw new ActionError('category-exists')
    }
    category.name = categoryName
    return {}
  },

  'category/reorder'(state, payload) {
    const ids = payload.ids
    if (!Array.isArray(ids) || ids.length !== state.categories.length) throw new ActionError('invalid-order')
    const byId = new Map(state.categories.map((category) => [category.id, category]))
    const seen = new Set()
    const ordered = []
    for (const id of ids) {
      if (typeof id !== 'string' || !byId.has(id) || seen.has(id)) throw new ActionError('invalid-order')
      seen.add(id)
      ordered.push(byId.get(id))
    }
    state.categories = ordered
    return {}
  },

  'category/remove'(state, payload) {
    const id = requireText(payload.id, 'category-required')
    const before = state.categories.length
    state.categories = state.categories.filter((category) => category.id !== id)
    if (state.categories.length === before) throw new ActionError('category-not-found')
    for (const bookmark of state.bookmarks) if (bookmark.categoryId === id) bookmark.categoryId = null
    return {}
  },

  'settings/defaultBrowser'(state, payload) {
    const browserId = requireText(payload.browserId, 'browser-required', 60)
    const known = browserId === SYSTEM_TARGET || browserId === IN_APP_TARGET || BROWSERS.some((entry) => entry.id === browserId)
    if (!known) throw new ActionError('unknown-browser')
    const profile = typeof payload.profile === 'string' && payload.profile !== '' ? payload.profile.slice(0, 120) : null
    state.settings.defaultBrowserId = browserId
    state.settings.defaultProfile = browserId === SYSTEM_TARGET || browserId === IN_APP_TARGET ? null : profile
    return {}
  },

  'import/run'(state, payload) {
    const sourceId = requireText(payload.sourceId, 'source-required', 200)
    const source = detectSources().find((candidate) => candidate.id === sourceId)
    if (source === undefined) throw new ActionError('source-not-found')
    const pages = readChromiumBookmarks(source.file)
    const counts = importPages(state, pages, source)
    return { notice: counts }
  },

  open(state, payload, runtime) {
    const url = parseWebUrl(requireText(payload.url, 'url-required', 2000))
    if (url === null) throw new ActionError('invalid-url')
    const browserId = typeof payload.browserId === 'string' && payload.browserId !== '' ? payload.browserId : runtime.defaultBrowserId
    const profile = typeof payload.profile === 'string' && payload.profile !== '' ? payload.profile : runtime.defaultProfile
    if (browserId === IN_APP_TARGET) throw new ActionError('in-app-target')
    launchUrl(url.href, browserId, profile)
    return {}
  },
}

/* ------------------------------------------------------------------ routes */

/**
 * Pure helpers exported for this package's own tests, which exercise profile
 * discovery and launch commands without starting a browser.
 */
export const internals = { browserCatalog, detectProfiles, detectSources, launchArgs, systemLaunchCommand }

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function sendMethodNotAllowed(res, allow) {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.end()
}

/** Collect a bounded request body as UTF-8 text; null past the ceiling. */
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

/** The composition's trust fence; true when the request was already answered. */
function rejected(ctx, req, res) {
  const rejection = ctx.connection.requestRejection(req)
  if (rejection === undefined) return false
  res.statusCode = rejection
  res.end()
  return true
}

/**
 * Register the state, sources, and action routes, each behind the trust fence.
 *
 * @param ctx - the plugin context carrying `webServer` and `connection`.
 */
export function apply(ctx) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: `${ROUTE_BASE}/state`,
        handler: (req, res) => {
          if (rejected(ctx, req, res)) return
          if (req.method !== 'GET') {
            sendMethodNotAllowed(res, 'GET')
            return
          }
          sendJson(res, 200, { state: loadState(), browsers: browserCatalog() })
        },
      }),
    `browser-bookmarks: GET ${ROUTE_BASE}/state`,
  )

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: `${ROUTE_BASE}/sources`,
        handler: (req, res) => {
          if (rejected(ctx, req, res)) return
          if (req.method !== 'GET') {
            sendMethodNotAllowed(res, 'GET')
            return
          }
          sendJson(res, 200, { sources: importSources() })
        },
      }),
    `browser-bookmarks: GET ${ROUTE_BASE}/sources`,
  )

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: `${ROUTE_BASE}/action`,
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
          if (body === null || typeof body !== 'object' || typeof body.action !== 'string') {
            sendJson(res, 400, { error: 'invalid-action' })
            return
          }
          const handler = ACTIONS[body.action]
          if (handler === undefined) {
            sendJson(res, 400, { error: 'unknown-action' })
            return
          }
          const payload = body.payload !== null && typeof body.payload === 'object' ? body.payload : {}
          const state = loadState()
          try {
            const result = handler(state, payload, {
              defaultBrowserId: state.settings.defaultBrowserId,
              defaultProfile: state.settings.defaultProfile,
            })
            if (body.action !== 'open') saveState(state)
            const response = {
              state,
              browsers: browserCatalog(),
              notice: result.notice ?? null,
            }
            if (typeof result.removed === 'number') response.removed = result.removed
            if (typeof result.moved === 'number') response.moved = result.moved
            if (typeof result.updated === 'number') response.updated = result.updated
            if (typeof result.position === 'number') response.position = result.position
            if (result.restored !== undefined) response.restored = result.restored
            if (typeof result.backupPath === 'string') response.backupPath = result.backupPath
            sendJson(res, 200, response)
          } catch (error) {
            const code = error instanceof ActionError ? error.message : 'action-failed'
            if (!(error instanceof ActionError)) ctx.logger?.warn?.(`browser-bookmarks: ${body.action} failed: ${error}`)
            sendJson(res, 400, { error: code, state, browsers: browserCatalog() })
          }
        },
      }),
    `browser-bookmarks: POST ${ROUTE_BASE}/action`,
  )
}
