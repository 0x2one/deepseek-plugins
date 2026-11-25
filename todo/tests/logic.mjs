import assert from 'node:assert/strict'
import { internals } from '../index.js'

const { nextOccurrence, normalizeDue, normalizeState, normalizeTags, normalizeConfig, placeItem, emptyState } = internals

const at = (year, month, day, hour = 9, minute = 0) => new Date(year, month - 1, day, hour, minute, 0, 0)

/* Repeat rules derive the next occurrence from the previous due date. */
{
  const due = at(2026, 3, 1).getTime()
  const next = nextOccurrence(due, 'daily', at(2026, 3, 1, 10).getTime())
  assert.equal(new Date(next).getDate(), 2)
  assert.equal(new Date(next).getHours(), 9)
}

{
  // Friday 2026-03-06 rolls to Monday 2026-03-09.
  const due = at(2026, 3, 6).getTime()
  const next = nextOccurrence(due, 'weekdays', at(2026, 3, 6, 10).getTime())
  const date = new Date(next)
  assert.equal(date.getDay(), 1)
  assert.equal(date.getDate(), 9)
}

{
  const due = at(2026, 3, 2).getTime()
  const next = nextOccurrence(due, 'weekly', at(2026, 3, 2, 10).getTime())
  assert.equal(new Date(next).getDate(), 9)
}

{
  // Monthly clamps 31 to the target month's last day, and rolls past stale occurrences.
  const due = at(2026, 1, 31).getTime()
  const next = nextOccurrence(due, 'monthly', at(2026, 2, 1).getTime())
  assert.equal(new Date(next).getMonth(), 1)
  assert.equal(new Date(next).getDate(), 28)

  const rolled = nextOccurrence(due, 'monthly', at(2026, 3, 5).getTime())
  assert.equal(new Date(rolled).getMonth(), 2)
  assert.equal(new Date(rolled).getDate(), 31)
}

{
  // A series anchored on the 31st clamps in February but returns to the 31st in March.
  const january = at(2026, 1, 31).getTime()
  const february = nextOccurrence(january, 'monthly', at(2026, 2, 1).getTime(), 31)
  assert.equal(new Date(february).getDate(), 28)
  const march = nextOccurrence(february, 'monthly', at(2026, 3, 1).getTime(), 31)
  assert.equal(new Date(march).getDate(), 31)
}

{
  // A date-only due value lands on the end of that local day.
  const due = normalizeDue(at(2026, 3, 5, 0).getTime(), false)
  const date = new Date(due.dueAt)
  assert.equal(due.dueHasTime, false)
  assert.equal(date.getHours(), 23)
  assert.equal(date.getMinutes(), 59)
  assert.equal(date.getDate(), 5)
  assert.deepEqual(normalizeDue(null, true), { dueAt: null, dueHasTime: false })
  assert.throws(() => normalizeDue(Number.NaN, false), /invalid-date/)
}

{
  // Tags keep their first spelling, ignore duplicates, and cap at six.
  assert.deepEqual(normalizeTags([' 工作 ', 'work', 'Work', '', 3, '生活', 'a', 'b', 'c']), ['工作', 'work', '生活', 'a', 'b', 'c'])
  assert.deepEqual(normalizeTags('nope'), [])
}

{
  const config = normalizeConfig({ reminderLeadMinutes: -5, donePreviewLimit: 9999, snapshotKeep: 1 })
  assert.equal(config.reminderLeadMinutes, 0)
  assert.equal(config.donePreviewLimit, 500)
  assert.equal(config.snapshotKeep, 3)
  assert.deepEqual(normalizeConfig(undefined), { reminderLeadMinutes: 0, donePreviewLimit: 50, snapshotKeep: 10 })
}

{
  // A damaged item is dropped; a repeat rule without a due date is cleared.
  const state = normalizeState({
    version: 1,
    revision: 7,
    items: [
      { id: 'a', title: '交周报', status: 'todo', dueAt: at(2026, 3, 5).getTime(), repeat: 'weekly', order: 0 },
      { id: 'a', title: 'duplicate', order: 1 },
      { title: '   ', order: 2 },
      { id: 'b', title: '无日期重复', repeat: 'daily', order: 3 },
      { id: 'c', title: '已完成', status: 'done', completedAt: 123, order: 4 },
    ],
  })
  assert.equal(state.revision, 7)
  assert.deepEqual(state.items.map((item) => item.id), ['a', 'b', 'c'])
  assert.equal(state.items[0].repeat, 'weekly')
  assert.equal(state.items[1].repeat, null)
  assert.equal(state.items[2].completedAt, 123)
  assert.equal(state.items[2].status, 'done')
}

{
  // Placement renumbers the target column and supports before/after neighbours.
  const state = emptyState()
  const make = (id, order) => ({ id, title: id, status: 'todo', order, tags: [], note: '', priority: null, dueAt: null, dueHasTime: false, repeat: null, seriesId: null, spawnedFrom: null, createdAt: 1, updatedAt: 1, completedAt: null, archivedAt: null, remindedAt: null })
  state.items = [make('x', 0), make('y', 1), make('z', 2)]
  placeItem(state, state.items[0], 'todo', null, 'z')
  assert.deepEqual(state.items.filter((item) => item.status === 'todo').sort((a, b) => a.order - b.order).map((item) => item.id), ['y', 'z', 'x'])
  placeItem(state, state.items[0], 'todo', 'y', null)
  assert.deepEqual(state.items.filter((item) => item.status === 'todo').sort((a, b) => a.order - b.order).map((item) => item.id), ['x', 'y', 'z'])
}

console.log('todo logic: ok')
