import assert from 'node:assert/strict'

let definition = null
globalThis.window = {
  __ModuleLoader__: {
    load(value) {
      definition = value
    },
  },
}

const React = {
  createElement: () => null,
  useEffect() {},
  useMemo() {},
  useRef() {},
  useState() {},
  useSyncExternalStore() {},
}

await import('../client.js')

const registrations = []
const commands = []
let selected = null
let dictionaries = null

const commandUi = {
  register(contribution) {
    commands.push(contribution)
    return () => {}
  },
}

const ctx = {
  effect(factory) {
    const cleanup = factory()
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  },
  locale: {
    register(_ns, value) {
      dictionaries = value
      return () => {}
    },
    bind: () => (key) => key,
  },
  layout: {
    selectPanel(id) {
      selected = id
    },
  },
  slots: {
    inject(_key, callback) {
      callback()
    },
    register(options) {
      registrations.push(options)
      return () => {}
    },
  },
  get(name) {
    return name === 'commandUi' ? commandUi : undefined
  },
}

const { factory } = definition
assert.equal(definition.id, '@local/todo')
const module = factory((name) => {
  if (name === 'react') return React
  throw new Error(`unexpected require: ${name}`)
})

assert.deepEqual(module.inject, ['slots', 'locale', 'layout'])
module.apply(ctx)

const names = registrations.map((entry) => entry.name)
assert.deepEqual(names.sort(), ['main', 'shell.overlay', 'sidebar.panellist'])

const main = registrations.find((entry) => entry.name === 'main')
assert.equal(main.key, 'todo')
assert.equal(typeof main.inject().controller.subscribe, 'function')

const entry = registrations.find((entry) => entry.name === 'sidebar.panellist')
assert.equal(entry.id, 'todo')
assert.equal(entry.order, 30)
assert.equal(entry.label(), 'panel')

const overlay = registrations.find((entry) => entry.name === 'shell.overlay')
assert.equal(overlay.id, 'todo.toasts')

assert.equal(commands.length, 1)
assert.equal(commands[0].name, 'todo')
assert.equal(commands[0].ui.kind, 'action')
commands[0].ui.run({})
assert.equal(selected, 'todo')

// Both dictionaries carry the same keys and the same placeholder names.
assert.notEqual(dictionaries, null)
const zhKeys = Object.keys(dictionaries.zh).sort()
const enKeys = Object.keys(dictionaries.en).sort()
assert.deepEqual(enKeys, zhKeys)
for (const key of zhKeys) {
  const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
  assert.deepEqual(placeholders(dictionaries.en[key]), placeholders(dictionaries.zh[key]), `placeholders differ for ${key}`)
}

console.log('todo client apply: ok')
