import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../index.js'

const home = mkdtempSync(join(tmpdir(), 'dsh-todo-test-'))
process.env.DSH_HOME = home

const routes = new Map()
const ctx = {
  effect(factory) {
    const cleanup = factory()
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  },
  logger: { warn() {} },
  connection: { requestRejection: () => undefined },
  webServer: {
    register(route) {
      routes.set(route.path, route.handler)
      return () => {}
    },
  },
}

apply(ctx, {})

assert.equal(typeof routes.get('/todo/state'), 'function')
assert.equal(typeof routes.get('/todo/action'), 'function')

/** Drive one registered handler with a synthetic request and collect its answer. */
async function invoke(path, { method = 'GET', body = null, headers = {} } = {}) {
  const payload = body === null ? null : JSON.stringify(body)
  const req = {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    async *[Symbol.asyncIterator]() {
      if (payload !== null) yield Buffer.from(payload, 'utf8')
    },
  }
  const response = {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(chunk) {
      this.body = chunk === undefined ? '' : String(chunk)
    },
  }
  await routes.get(path)(req, response)
  let parsed = null
  try {
    parsed = JSON.parse(response.body)
  } catch {
    parsed = null
  }
  return { status: response.statusCode, body: parsed, raw: response.body }
}

const action = (name, payload, expectedRevision) => invoke('/todo/action', { method: 'POST', body: { action: name, payload, expectedRevision } })
const readState = async () => (await invoke('/todo/state')).body

try {
  const empty = await readState()
  assert.equal(empty.state.items.length, 0)
  assert.equal(empty.config.donePreviewLimit, 50)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  const added = await action('item/add', {
    title: '  交周报  ',
    dueAt: tomorrow.getTime(),
    dueHasTime: true,
    priority: 'high',
    tags: ['工作', '工作'],
    repeat: 'daily',
  })
  assert.equal(added.status, 200)
  assert.equal(added.body.state.items.length, 1)
  const item = added.body.state.items[0]
  assert.equal(item.title, '交周报')
  assert.deepEqual(item.tags, ['工作'])
  assert.equal(item.status, 'todo')
  assert.equal(item.dueHasTime, true)
  assert.equal(item.seriesId !== null, true)

  const done = await action('item/complete', { id: item.id })
  assert.equal(done.status, 200)
  assert.equal(done.body.notice.kind, 'repeatSpawned')
  assert.equal(done.body.notice.sourceId, item.id)
  assert.equal(done.body.state.items.length, 2)
  const child = done.body.state.items.find((candidate) => candidate.spawnedFrom === item.id)
  assert.equal(child.status, 'todo')
  assert.equal(child.anchorDay, tomorrow.getDate())
  const expectedNext = new Date(tomorrow)
  expectedNext.setDate(expectedNext.getDate() + 1)
  assert.equal(child.dueAt, expectedNext.getTime())

  // An untouched generated occurrence is retracted by undoing its parent.
  const undone = await action('item/uncomplete', { id: item.id })
  assert.equal(undone.status, 200)
  assert.equal(undone.body.notice.kind, 'spawnRemoved')
  assert.equal(undone.body.state.items.length, 1)

  // Stale writers get the current document instead of overwriting.
  const stale = await action('item/add', { title: '不该写入' }, 0)
  assert.equal(stale.status, 409)
  assert.equal(stale.body.error, 'stale-revision')
  assert.equal(stale.body.state.items.length, 1)

  const bad = await action('item/add', { title: '   ' })
  assert.equal(bad.status, 400)
  assert.equal(bad.body.error, 'invalid-title')

  const repeatless = await action('item/add', { title: '没有日期', repeat: 'daily' })
  assert.equal(repeatless.status, 400)
  assert.equal(repeatless.body.error, 'repeat-requires-date')

  const second = await action('item/add', { title: '改登录页' })
  const moved = await action('item/reorder', { id: second.body.itemId, toStatus: 'doing' })
  assert.equal(moved.status, 200)
  const movedItem = moved.body.state.items.find((candidate) => candidate.id === second.body.itemId)
  assert.equal(movedItem.status, 'doing')

  const doneAgain = await action('item/complete', { id: item.id })
  assert.equal(doneAgain.status, 200)
  assert.equal(doneAgain.body.state.items.filter((candidate) => candidate.status === 'done').length, 1)
  assert.equal(doneAgain.body.state.items.length, 3)

  const archived = await action('items/archiveDone')
  assert.equal(archived.status, 200)
  assert.equal(archived.body.state.items.filter((candidate) => candidate.archivedAt !== null).length, 1)

  // Everything above is durable: the state route reads a fresh document each call.
  const persisted = await readState()
  assert.equal(persisted.state.items.length, 3)
  const file = join(home, 'todo', 'todos.json')
  assert.equal(existsSync(file), true)
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(raw.version, 1)
  assert.equal(raw.items.length, 3)
  assert.equal(readdirSync(join(home, 'todo', 'backups')).length > 0, true)

  // A damaged document is quarantined, not silently overwritten.
  writeFileSync(file, '{ not json', 'utf8')
  const recovered = await readState()
  assert.equal(recovered.state.items.length, 0)
  const quarantined = readdirSync(join(home, 'todo')).filter((entry) => entry.startsWith('todos.corrupt-'))
  assert.equal(quarantined.length, 1)

  // Version ceilings refuse writes instead of letting an old plugin erase newer data.
  writeFileSync(file, JSON.stringify({ version: 99, revision: 1, items: [] }), 'utf8')
  const refused = await invoke('/todo/action', { method: 'POST', body: { action: 'item/add', payload: { title: 'x' } } })
  assert.equal(refused.status, 409)
  assert.equal(refused.body.error, 'unsupported-version')

  console.log('todo host: ok')
} finally {
  rmSync(home, { recursive: true, force: true })
}
