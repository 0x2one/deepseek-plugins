// Static checks for the plugin's browser half: every CSS custom property it uses
// must be defined by the shipped theme (or published on the root by the layout),
// the CSS block must be brace-balanced, and the module must load and register
// both slots with the expected options.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const pluginDir = process.argv[2]
const themeStyles = process.argv[3]
const source = readFileSync(join(pluginDir, 'client.js'), 'utf8')

// --- 1. CSS custom properties ------------------------------------------------
// Pass the theme's src/styles directory to check tokens against the shipped
// theme. It lives inside app.asar, so copy it out with the Electron runtime
// first; without it this check is skipped and the rest still runs.
const defined = new Set()
let themeChecked = false
if (themeStyles !== undefined && existsSync(themeStyles)) {
  themeChecked = true
  for (const file of readdirSync(themeStyles)) {
    if (!file.endsWith('.css')) continue
    const text = readFileSync(join(themeStyles, file), 'utf8')
    for (const match of text.matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(match[1])
  }
}
// Published on the root element by the layout frame / theme presenter, not in a stylesheet.
const published = new Set([
  '--dsh-frame-top-clearance',
  '--dsh-frame-leading-clearance',
  '--dsh-content-font-size',
  '--dsh-code-font-size',
  '--dsh-font-family-text',
  '--dsh-font-family-code',
  '--dsh-font-family-terminal',
  '--ds-font-family-code',
])

const used = new Set()
for (const match of source.matchAll(/var\((--[a-z0-9-]+)/g)) used.add(match[1])

const failures = []
let missing = 0
if (themeChecked) {
  for (const token of [...used].sort()) {
    const ok = defined.has(token) || published.has(token)
    if (!ok) { missing += 1; failures.push(token); console.log(`MISSING token ${token}`) }
  }
  console.log(`tokens used=${used.size} unresolved=${missing}`)
} else {
  console.log(`tokens used=${used.size} (theme not supplied, resolution skipped)`)
}

// --- 2. CSS block balance ----------------------------------------------------
const cssStart = source.indexOf('const CSS = `')
const cssEnd = source.indexOf('`\n\n    /* --------------------------------------------------------------- plugin */')
if (cssStart < 0 || cssEnd < 0) {
  failures.push('css-block')
  console.log('MISSING css block markers')
} else {
  const css = source.slice(cssStart + 'const CSS = `'.length, cssEnd)
  let depth = 0
  let min = 0
  for (const ch of css) {
    if (ch === '{') depth += 1
    else if (ch === '}') { depth -= 1; if (depth < min) min = depth }
  }
  const balanced = depth === 0 && min === 0
  if (!balanced) failures.push('css-balance')
  console.log(`css braces depth=${depth} min=${min} declarations=${(css.match(/;/g) ?? []).length}`)
}

// --- 3. Module load and registrations ---------------------------------------
const registrations = []
globalThis.window = {
  __ModuleLoader__: {
    load({ id, factory }) {
      const stubReact = {
        createElement: () => null,
        useCallback: (fn) => fn,
        useEffect: () => {},
        useMemo: (fn) => fn(),
        useRef: (value) => ({ current: value }),
        useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
        useSyncExternalStore: () => null,
      }
      const module = factory((name) => (name === 'react' ? stubReact : {}))
      const ctx = {
        effect: (fn) => { fn() },
        locale: {
          register: () => () => {},
          bind: () => (key) => key,
        },
        layout: {
          selectPanel: () => {},
          panelInfo: { subscribe: () => () => {}, getSnapshot: () => ({ activePanelId: null }) },
        },
        slots: {
          inject: (name, callback) => { registrations.push({ name }); callback() },
          register: (options, component) => {
            registrations[registrations.length - 1].options = options
            registrations[registrations.length - 1].component = component
            return () => {}
          },
        },
      }
      if (typeof module.apply !== 'function') throw new Error('module has no apply')
      module.apply(ctx)
      console.log(`module ${id} applied, inject=${JSON.stringify(module.inject)}`)
    },
  },
}
await import(new URL(`file:///${join(pluginDir, 'client.js').replace(/\\/g, '/')}`).href)

const main = registrations.find((entry) => entry.name === 'main')
const panel = registrations.find((entry) => entry.name === 'sidebar.panellist')
if (main === undefined || main.options?.key !== 'agents-md') { failures.push('main-slot'); console.log('MISSING main slot registration') }
if (panel === undefined || panel.options?.id !== 'agents-md') { failures.push('panel-slot'); console.log('MISSING sidebar slot registration') }
if (panel !== undefined && typeof panel.options?.label !== 'function') { failures.push('panel-label'); console.log('MISSING panel label thunk') }
if (main !== undefined && typeof main.component !== 'function') { failures.push('main-component'); console.log('MISSING main component') }
console.log('registrations:', registrations.map((entry) => `${entry.name}(${JSON.stringify(entry.options)})`).join(' '))

console.log(failures.length === 0 ? 'ALL PASSED' : `FAILURES: ${failures.length}`)
process.exit(failures.length === 0 ? 0 : 1)
