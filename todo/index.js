/**
 * Host half of the todo plugin: one durable JSON document under the Harness home,
 * a small action table that mutates it, and two browser routes guarded by the
 * composition's trust fence.
 *
 * Nothing here reaches a model request: no tools, no prompt sections, no session
 * events. The document is the only state, and every write is atomic (temp file then
 * rename) with a rolling snapshot before destructive operations.
 */
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Cordis function-plugin name. */
export const name = 'todo'

/** The route carrier and the trust fence guarding every route. */
export const inject = ['webServer', 'connection']

/** Route base; the client half fetches under it. */
const ROUTE_BASE = '/todo'

/** Mutation bodies are tiny JSON objects; anything larger is hostile. */
const MAX_BODY_BYTES = 512 * 1024

/** Declared shape version of the stored document. */
const STATE_VERSION = 1

const MAX_TITLE = 200
const MAX_NOTE = 2000
const MAX_TAGS = 6
const MAX_TAG = 24

const STATUSES = new Set(['todo', 'doing', 'done'])
const OPEN_STATUSES = new Set(['todo', 'doing'])
const PRIORITIES = new Set(['high', 'medium', 'low'])
const REPEATS = new Set(['daily', 'weekdays', 'weekly', 'monthly'])

/** Actions that snapshot the document before they change it. */
const SNAPSHOT_ACTIONS = new Set(['item/archive', 'item/remove', 'item/reorder', 'items/archiveDone', 'items/rerank'])

/** Defaults for the plugin's row configuration. */
const DEFAULT_CONFIG = { reminderLeadMinutes: 0, donePreviewLimit: 50, snapshotKeep: 10 }

/** A refused action: the code reaches the page as the failure text. */
class ActionError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

/* ------------------------------------------------------------------ storage */

/** The Harness home, matching the other profile plugins. */
function homeDir() {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

/** This plugin's durable directory. */
function storeDir() {
  const dir = join(homeDir(), 'todo')
  mkdirSync(dir, { recursive: true })
  return dir
}

function stateFile() {
  return join(storeDir(), 'todos.json')
}

function backupsDir() {
  return join(storeDir(), 'backups')
}

/** A fresh, empty document. */
function emptyState() {
  return { version: STATE_VERSION, revision: 0, updatedAt: Date.now(), items: [], settings: {} }
}

/** A new opaque id. */
function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null
}

/** Trim, cap, and deduplicate tags, keeping the first spelling. */
function normalizeTags(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const tags = []
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const tag = raw.trim().slice(0, MAX_TAG)
    if (tag === '') continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
    if (tags.length >= MAX_TAGS) break
  }
  return tags
}

/** Coerce one stored item into the current shape, or null when unusable. */
function normalizeItem(value) {
  if (!isObject(value)) return null
  const title = typeof value.title === 'string' ? value.title.trim().slice(0, MAX_TITLE) : ''
  if (title === '') return null
  const status = STATUSES.has(value.status) ? value.status : 'todo'
  const dueHasTime = value.dueHasTime === true
  const dueAt = Number.isFinite(value.dueAt) ? value.dueAt : null
  const createdAt = Number.isFinite(value.createdAt) ? value.createdAt : Date.now()
  const updatedAt = Number.isFinite(value.updatedAt) ? value.updatedAt : createdAt
  return {
    id: typeof value.id === 'string' && value.id !== '' ? value.id : newId(),
    title,
    note: typeof value.note === 'string' ? value.note.slice(0, MAX_NOTE) : '',
    status,
    priority: PRIORITIES.has(value.priority) ? value.priority : null,
    tags: normalizeTags(value.tags),
    dueAt,
    dueHasTime: dueAt === null ? false : dueHasTime,
    repeat: REPEATS.has(value.repeat) ? value.repeat : null,
    anchorDay: Number.isInteger(value.anchorDay) && value.anchorDay >= 1 && value.anchorDay <= 31 ? value.anchorDay : null,
    order: Number.isFinite(value.order) ? value.order : 0,
    seriesId: typeof value.seriesId === 'string' && value.seriesId !== '' ? value.seriesId : null,
    spawnedFrom: typeof value.spawnedFrom === 'string' && value.spawnedFrom !== '' ? value.spawnedFrom : null,
    createdAt,
    updatedAt,
    completedAt: status === 'done' ? (Number.isFinite(value.completedAt) ? value.completedAt : updatedAt) : null,
    archivedAt: Number.isFinite(value.archivedAt) ? value.archivedAt : null,
    remindedAt: Number.isFinite(value.remindedAt) ? value.remindedAt : null,
  }
}

/** Build a validated document from any parsed JSON value. */
function normalizeState(value) {
  const state = emptyState()
  if (!isObject(value)) return state
  state.revision = Number.isFinite(value.revision) && value.revision >= 0 ? Math.floor(value.revision) : 0
  if (Number.isFinite(value.updatedAt)) state.updatedAt = value.updatedAt
  if (isObject(value.settings)) {
    if (Number.isFinite(value.settings.reminderLeadMinutes)) state.settings.reminderLeadMinutes = value.settings.reminderLeadMinutes
    if (Number.isFinite(value.settings.donePreviewLimit)) state.settings.donePreviewLimit = value.settings.donePreviewLimit
  }
  const seen = new Set()
  for (const raw of Array.isArray(value.items) ? value.items : []) {
    const item = normalizeItem(raw)
    if (item === null || seen.has(item.id)) continue
    seen.add(item.id)
    state.items.push(item)
  }
  // A repeat rule without a due date can never spawn; drop the rule, keep the item.
  for (const item of state.items) if (item.repeat !== null && item.dueAt === null) item.repeat = null
  return state
}

/** Read the document; a missing file reads as empty, a damaged one is quarantined. */
function loadState() {
  let text
  try {
    text = readFileSync(stateFile(), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return emptyState()
    throw error
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    quarantineCorrupt()
    return emptyState()
  }
  if (isObject(parsed) && Number.isFinite(parsed.version) && parsed.version > STATE_VERSION) {
    throw new ActionError('unsupported-version')
  }
  return normalizeState(parsed)
}

/** Keep a damaged document as evidence instead of silently replacing it. */
function quarantineCorrupt() {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    renameSync(stateFile(), join(storeDir(), `todos.corrupt-${stamp}.json`))
  } catch {
    /* nothing left to preserve */
  }
}

/** Write the document durably: temp file, then rename over the target. */
function saveState(state) {
  state.version = STATE_VERSION
  state.revision += 1
  state.updatedAt = Date.now()
  const file = stateFile()
  const temp = `${file}.${process.pid}.tmp`
  writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  renameSync(temp, file)
}

/** Keep a safety snapshot, pruning the oldest beyond the configured count. */
function writeSnapshot(state, config) {
  try {
    const dir = backupsDir()
    mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    writeFileSync(join(dir, `todos-${stamp}.json`), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    const files = readdirSync(dir)
      .filter((entry) => entry.startsWith('todos-') && entry.endsWith('.json'))
      .sort()
    const keep = Math.max(1, config.snapshotKeep)
    for (const entry of files.slice(0, Math.max(0, files.length - keep))) {
      rmSync(join(dir, entry), { force: true })
    }
  } catch {
    /* a failed safety net must never block the operation it protects */
  }
}

/* -------------------------------------------------------------------- dates */

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 0, 0)
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds())
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function addMonthsClamped(date, day) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const targetYear = year + Math.floor(month / 12)
  const targetMonth = month % 12
  const clamped = Math.min(day, daysInMonth(targetYear, targetMonth))
  return new Date(targetYear, targetMonth, clamped, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds())
}

/** Normalize a due value: a date without a time lands on that local day's 23:59. */
function normalizeDue(dueAt, dueHasTime) {
  if (dueAt === null || dueAt === undefined) return { dueAt: null, dueHasTime: false }
  if (!Number.isFinite(dueAt)) throw new ActionError('invalid-date')
  if (dueHasTime === true) return { dueAt, dueHasTime: true }
  return { dueAt: endOfLocalDay(new Date(dueAt)).getTime(), dueHasTime: false }
}

/**
 * The next occurrence strictly after `now`, derived from the previous due date.
 *
 * @param anchorDay - The series' intended day-of-month (1–31), so a February
 *   clamp does not drag every later month down to the 28th.
 * @returns the next due timestamp, or null when the rule cannot advance.
 */
function nextOccurrence(dueAt, repeat, now, anchorDay) {
  if (!REPEATS.has(repeat) || !Number.isFinite(dueAt)) return null
  const base = new Date(dueAt)
  const originalDay = Number.isInteger(anchorDay) && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : base.getDate()
  let candidate = base
  for (let step = 0; step < 1000; step += 1) {
    if (repeat === 'daily') candidate = addDays(candidate, 1)
    else if (repeat === 'weekdays') {
      candidate = addDays(candidate, 1)
      while (candidate.getDay() === 0 || candidate.getDay() === 6) candidate = addDays(candidate, 1)
    } else if (repeat === 'weekly') candidate = addDays(candidate, 7)
    else candidate = addMonthsClamped(candidate, originalDay)
    if (candidate.getTime() > now) return candidate.getTime()
  }
  return null
}

/* ----------------------------------------------------------------- actions */

function requireText(value, code, max) {
  if (typeof value !== 'string' || value.trim() === '') throw new ActionError(code)
  return value.trim().slice(0, max)
}

function requireEnum(value, allowed, code) {
  if (!allowed.has(value)) throw new ActionError(code)
  return value
}

function findItem(state, id) {
  const item = state.items.find((candidate) => candidate.id === id)
  if (item === undefined) throw new ActionError('item-not-found')
  return item
}

/** One column in insertion order. */
function columnItems(state, status) {
  return state.items.filter((item) => item.status === status).sort((left, right) => left.order - right.order)
}

/**
 * Put an item into a column at a position and renumber that column.
 *
 * @param beforeId - Place before this sibling.
 * @param afterId - Place after this sibling (used when `beforeId` is absent).
 */
function placeItem(state, item, status, beforeId, afterId) {
  const column = state.items.filter((candidate) => candidate.status === status && candidate.id !== item.id).sort((left, right) => left.order - right.order)
  item.status = status
  let index = 0
  if (typeof beforeId === 'string' && beforeId !== '') {
    const found = column.findIndex((candidate) => candidate.id === beforeId)
    index = found < 0 ? 0 : found
  } else if (typeof afterId === 'string' && afterId !== '') {
    const found = column.findIndex((candidate) => candidate.id === afterId)
    index = found < 0 ? column.length : found + 1
  }
  column.splice(index, 0, item)
  column.forEach((candidate, position) => {
    candidate.order = position
  })
}

/** Finish an item and spawn its next repeating occurrence. */
function completeItem(state, item, now) {
  if (item.status === 'done') return null
  item.status = 'done'
  item.completedAt = now
  item.archivedAt = null
  item.updatedAt = now
  placeItem(state, item, 'done', null, null)
  return spawnNext(state, item, now)
}

/** Undo completion, retracting an untouched automatic next occurrence. */
function uncompleteItem(state, item, now) {
  if (item.status !== 'done') return null
  item.status = 'todo'
  item.completedAt = null
  item.archivedAt = null
  item.updatedAt = now
  placeItem(state, item, 'todo', null, null)
  const child = state.items.find((candidate) => candidate.spawnedFrom === item.id)
  if (child === undefined) return null
  if (child.status === 'todo' && child.updatedAt === child.createdAt) {
    state.items = state.items.filter((candidate) => candidate.id !== child.id)
    return { kind: 'spawnRemoved', id: child.id, sourceId: item.id }
  }
  return { kind: 'spawnKept', id: child.id, sourceId: item.id }
}

/** Create the next occurrence of a completed repeating item. */
function spawnNext(state, item, now) {
  if (item.repeat === null || item.dueAt === null) return null
  const anchorDay = item.anchorDay ?? new Date(item.dueAt).getDate()
  const next = nextOccurrence(item.dueAt, item.repeat, now, anchorDay)
  if (next === null) return null
  const seriesId = item.seriesId ?? newId()
  item.seriesId = seriesId
  const child = {
    id: newId(),
    title: item.title,
    note: item.note,
    status: 'todo',
    priority: item.priority,
    tags: [...item.tags],
    dueAt: next,
    dueHasTime: item.dueHasTime,
    repeat: item.repeat,
    anchorDay,
    order: 0,
    seriesId,
    spawnedFrom: item.id,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
    remindedAt: null,
  }
  state.items.push(child)
  placeItem(state, child, 'todo', null, null)
  return { kind: 'repeatSpawned', id: child.id, dueAt: child.dueAt, sourceId: item.id }
}

/** Read a priority value from a payload, where null and '' both mean none. */
function readPriority(value) {
  if (value === null || value === undefined || value === '') return null
  return requireEnum(value, PRIORITIES, 'invalid-priority')
}

/** Read a repeat rule from a payload, where null and '' both mean none. */
function readRepeat(value) {
  if (value === null || value === undefined || value === '') return null
  return requireEnum(value, REPEATS, 'invalid-repeat')
}

/** Read a due change against the item's current value. */
function readDue(payload, item) {
  const hasDueKey = payload.dueAt !== undefined
  const hasTimeKey = payload.dueHasTime !== undefined
  if (!hasDueKey && !hasTimeKey) return null
  const hasTime = hasTimeKey ? payload.dueHasTime === true : item.dueHasTime
  const raw = hasDueKey ? payload.dueAt : item.dueAt
  return normalizeDue(raw, hasTime)
}

function compareDue(left, right) {
  if (left.dueAt === null && right.dueAt === null) return 0
  if (left.dueAt === null) return 1
  if (right.dueAt === null) return -1
  return left.dueAt - right.dueAt
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

const ACTIONS = {
  'item/add'(state, payload, runtime) {
    const now = runtime.now
    const title = requireText(payload.title, 'invalid-title', MAX_TITLE)
    const status = payload.status === undefined ? 'todo' : requireEnum(payload.status, OPEN_STATUSES, 'invalid-status')
    const due = normalizeDue(payload.dueAt === undefined ? null : payload.dueAt, payload.dueHasTime === true)
    const repeat = readRepeat(payload.repeat)
    if (repeat !== null && due.dueAt === null) throw new ActionError('repeat-requires-date')
    const item = {
      id: newId(),
      title,
      note: typeof payload.note === 'string' ? payload.note.slice(0, MAX_NOTE) : '',
      status,
      priority: readPriority(payload.priority),
      tags: normalizeTags(payload.tags),
      dueAt: due.dueAt,
      dueHasTime: due.dueHasTime,
      repeat,
      anchorDay: due.dueAt === null ? null : new Date(due.dueAt).getDate(),
      order: 0,
      seriesId: repeat === null ? null : newId(),
      spawnedFrom: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      archivedAt: null,
      remindedAt: null,
    }
    state.items.push(item)
    placeItem(state, item, status, null, null)
    return { id: item.id }
  },

  'item/update'(state, payload) {
    const item = findItem(state, requireText(payload.id, 'item-not-found'))
    if (payload.title !== undefined) item.title = requireText(payload.title, 'invalid-title', MAX_TITLE)
    if (payload.note !== undefined) item.note = typeof payload.note === 'string' ? payload.note.slice(0, MAX_NOTE) : ''
    if (payload.priority !== undefined) item.priority = readPriority(payload.priority)
    if (payload.tags !== undefined) item.tags = normalizeTags(payload.tags)
    if (payload.repeat !== undefined) item.repeat = readRepeat(payload.repeat)
    const due = readDue(payload, item)
    if (due !== null) {
      item.dueAt = due.dueAt
      item.dueHasTime = due.dueHasTime
      item.anchorDay = due.dueAt === null ? null : new Date(due.dueAt).getDate()
    }
    if (item.repeat !== null && item.dueAt === null) throw new ActionError('repeat-requires-date')
    item.updatedAt = runtimeNow()
    return {}
  },

  'item/status'(state, payload, runtime) {
    const item = findItem(state, requireText(payload.id, 'item-not-found'))
    const status = requireEnum(payload.status, STATUSES, 'invalid-status')
    const now = runtime.now
    let notice = null
    if (status === 'done') {
      notice = completeItem(state, item, now)
    } else {
      if (item.status === 'done') notice = uncompleteItem(state, item, now)
      item.status = status
      item.completedAt = null
      item.updatedAt = now
      placeItem(state, item, status, null, null)
    }
    return { notice: notice ?? undefined }
  },

  'item/complete'(state, payload, runtime) {
    const item = findItem(state, requireText(payload.id, 'item-not-found'))
    const notice = completeItem(state, item, runtime.now)
    return { notice: notice ?? undefined }
  },

  'item/uncomplete'(state, payload, runtime) {
    const item = findItem(state, requireText(payload.id, 'item-not-found'))
    const notice = uncompleteItem(state, item, runtime.now)
    return { notice: notice ?? undefined }
  },

  'item/reorder'(state, payload, runtime) {
    const item = findItem(state, requireText(payload.id, 'item-not-found'))
    const now = runtime.now
    const target = payload.toStatus === undefined || payload.toStatus === null ? item.status : requireEnum(payload.toStatus, STATUSES, 'invalid-status')
    let notice = null
    if (target !== item.status) {
      if (target === 'done') notice = completeItem(state, item, now)
      else {
        if (item.status === 'done') notice = uncompleteItem(state, item, now)
        item.status = target
        item.completedAt = null
        item.updatedAt = now
      }
    }
    placeItem(state, item, target, payload.beforeId, payload.afterId)
    return { notice: notice ?? undefined }
  },

  'item/archive'(state, payload, runtime) {
    const item = findItem(state, requireText(payload.id, 'item-not-found'))
    if (item.status !== 'done') throw new ActionError('invalid-status')
    item.archivedAt = runtime.now
    item.updatedAt = runtime.now
    return {}
  },

  'item/unarchive'(state, payload, runtime) {
    const item = findItem(state, requireText(payload.id, 'item-not-found'))
    if (item.archivedAt === null) return {}
    item.archivedAt = null
    item.updatedAt = runtime.now
    return {}
  },

  'item/remove'(state, payload) {
    const item = findItem(state, requireText(payload.id, 'item-not-found'))
    state.items = state.items.filter((candidate) => candidate.id !== item.id)
    // A generated child without its parent loses its provenance; keep the child.
    return { removed: item.id }
  },

  'items/archiveDone'(state, payload, runtime) {
    let archived = 0
    for (const item of state.items) {
      if (item.status !== 'done' || item.archivedAt !== null) continue
      item.archivedAt = runtime.now
      item.updatedAt = runtime.now
      archived += 1
    }
    return { archived }
  },

  'items/rerank'(state, payload) {
    const by = requireEnum(payload.by, new Set(['priority', 'due']), 'invalid-order')
    for (const status of OPEN_STATUSES) {
      const column = columnItems(state, status)
      column.sort((left, right) => {
        if (by === 'priority') {
          const rank = (PRIORITY_RANK[left.priority] ?? 3) - (PRIORITY_RANK[right.priority] ?? 3)
          if (rank !== 0) return rank
          return compareDue(left, right)
        }
        const due = compareDue(left, right)
        if (due !== 0) return due
        return (PRIORITY_RANK[left.priority] ?? 3) - (PRIORITY_RANK[right.priority] ?? 3)
      })
      column.forEach((candidate, position) => {
        candidate.order = position
      })
    }
    return {}
  },

  'item/reminded'(state, payload, runtime) {
    const item = findItem(state, requireText(payload.id, 'item-not-found'))
    // A reminder is not an edit: updatedAt stays put so undo still retracts an
    // untouched generated occurrence.
    item.remindedAt = runtime.now
    return {}
  },

  'settings/update'(state, payload) {
    if (payload.reminderLeadMinutes !== undefined) {
      state.settings.reminderLeadMinutes = clampInt(payload.reminderLeadMinutes, 0, 1440, DEFAULT_CONFIG.reminderLeadMinutes)
    }
    if (payload.donePreviewLimit !== undefined) {
      state.settings.donePreviewLimit = clampInt(payload.donePreviewLimit, 20, 500, DEFAULT_CONFIG.donePreviewLimit)
    }
    return {}
  },
}

/** Monotonic-enough clock for one request. */
function runtimeNow() {
  return Date.now()
}

function clampInt(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Normalize the plugin row's configuration. */
function normalizeConfig(raw) {
  const source = isObject(raw) ? raw : {}
  return {
    reminderLeadMinutes: clampInt(source.reminderLeadMinutes, 0, 1440, DEFAULT_CONFIG.reminderLeadMinutes),
    donePreviewLimit: clampInt(source.donePreviewLimit, 20, 500, DEFAULT_CONFIG.donePreviewLimit),
    snapshotKeep: clampInt(source.snapshotKeep, 3, 50, DEFAULT_CONFIG.snapshotKeep),
  }
}

/** Effective config: row defaults, then document overrides saved by the page. */
function effectiveConfig(base, state) {
  return {
    ...base,
    ...(Number.isFinite(state.settings.reminderLeadMinutes) ? { reminderLeadMinutes: clampInt(state.settings.reminderLeadMinutes, 0, 1440, base.reminderLeadMinutes) } : {}),
    ...(Number.isFinite(state.settings.donePreviewLimit) ? { donePreviewLimit: clampInt(state.settings.donePreviewLimit, 20, 500, base.donePreviewLimit) } : {}),
  }
}

/* ------------------------------------------------------------------ routes */

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
 * Register the state and action routes behind the trust fence.
 *
 * @param ctx - the plugin context carrying `webServer` and `connection`.
 * @param rawConfig - the plugin row's configuration.
 */
export function apply(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig)

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
          try {
            const state = loadState()
            sendJson(res, 200, { state, config: effectiveConfig(config, state) })
          } catch (error) {
            const code = error instanceof ActionError ? error.code : 'state-unreadable'
            sendJson(res, 409, { error: code })
          }
        },
      }),
    `todo: GET ${ROUTE_BASE}/state`,
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
          if (!isObject(body) || typeof body.action !== 'string') {
            sendJson(res, 400, { error: 'invalid-action' })
            return
          }
          const handler = ACTIONS[body.action]
          if (handler === undefined) {
            sendJson(res, 400, { error: 'unknown-action' })
            return
          }
          let state
          try {
            state = loadState()
          } catch (error) {
            const code = error instanceof ActionError ? error.code : 'state-unreadable'
            sendJson(res, 409, { error: code })
            return
          }
          if (body.expectedRevision !== undefined && body.expectedRevision !== state.revision) {
            sendJson(res, 409, { error: 'stale-revision', state, config: effectiveConfig(config, state) })
            return
          }
          const payload = isObject(body.payload) ? body.payload : {}
          const before = SNAPSHOT_ACTIONS.has(body.action) ? JSON.parse(JSON.stringify(state)) : null
          let result
          try {
            result = handler(state, payload, { now: runtimeNow() }) ?? {}
          } catch (error) {
            const code = error instanceof ActionError ? error.code : 'action-failed'
            if (!(error instanceof ActionError)) ctx.logger?.warn?.(`todo: ${body.action} failed: ${error}`)
            sendJson(res, 400, { error: code, state, config: effectiveConfig(config, state) })
            return
          }
          try {
            saveState(state)
          } catch (error) {
            ctx.logger?.warn?.(`todo: save failed: ${error}`)
            sendJson(res, 500, { error: 'save-failed' })
            return
          }
          if (before !== null) writeSnapshot(before, config)
          sendJson(res, 200, {
            state,
            config: effectiveConfig(config, state),
            notice: result.notice ?? null,
            itemId: typeof result.id === 'string' ? result.id : null,
            archived: typeof result.archived === 'number' ? result.archived : null,
          })
        },
      }),
    `todo: POST ${ROUTE_BASE}/action`,
  )
}

/** Pure helpers exported for this package's own tests, which never touch a profile. */
export const internals = {
  nextOccurrence,
  normalizeDue,
  normalizeState,
  normalizeItem,
  normalizeTags,
  normalizeConfig,
  placeItem,
  addDays,
  addMonthsClamped,
  startOfLocalDay,
  endOfLocalDay,
  emptyState,
  columnItems,
}
