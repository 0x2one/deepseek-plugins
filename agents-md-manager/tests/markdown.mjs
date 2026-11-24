// Behaviour of the built-in Markdown reader: loads the real client module with a
// tree-building React stand-in, then parses and renders a representative rule
// file. No browser and no Harness runtime involved.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pluginDir = process.argv[2]
const failures = []

function check(label, condition, detail) {
  if (condition) console.log(`ok   ${label}`)
  else { failures.push(label); console.log(`FAIL ${label}${detail === undefined ? '' : ' -> ' + JSON.stringify(detail)}`) }
}

/** A React stand-in that keeps the element tree so it can be inspected. */
function element(type, props, ...children) {
  return { type, props: props ?? {}, children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false) }
}

/** Load the module and hand back its exported pure helpers. */
async function load() {
  let loaded = null
  globalThis.window = {
    __ModuleLoader__: {
      load({ id, factory }) {
        const react = {
          createElement: element,
          useCallback: (fn) => fn,
          useEffect: () => {},
          useMemo: (fn) => fn(),
          useRef: (value) => ({ current: value }),
          useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
          useSyncExternalStore: () => null,
        }
        const module = factory((name) => (name === 'react' ? react : {}))
        loaded = { id, module }
      },
    },
  }
  await import(pathToFileURL(join(pluginDir, 'client.js')).href)
  return loaded
}

/** Collect every element of one type in a rendered tree. */
function findAll(node, type, out = []) {
  if (Array.isArray(node)) { for (const child of node) findAll(child, type, out); return out }
  if (node === null || node === undefined || typeof node !== 'object') return out
  if (node.type === type) out.push(node)
  findAll(node.children, type, out)
  return out
}

/** Concatenate the text of one rendered node. */
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node === null || node === undefined) return ''
  if (typeof node === 'string') return node
  if (typeof node !== 'object') return ''
  return textOf(node.children)
}

const loaded = await load()
const { parseMarkdown, parseInline, renderBlocks } = loaded.module.internals
check('module id', loaded.id === '@local/agents-md-manager', loaded.id)

// --- parsing -----------------------------------------------------------------
const source = [
  '# 标题一',
  '',
  '普通段落带着 **加粗**、*斜体*、`代码`、~~删除~~ 与 [链接](https://example.com)。',
  '段落的第二行应当仍属于同一段。',
  '',
  '## 列表',
  '',
  '- 第一项',
  '  - 嵌套一项',
  '    - 再嵌一层',
  '- [ ] 待办',
  '- [x] 已完成',
  '',
  '1. 有序一',
  '2. 有序二',
  '',
  '> 引用一行',
  '> 引用第二行',
  '',
  '```js',
  'const a = 1',
  '```',
  '',
  '| 列 A | 列 B |',
  '| :--- | ---: |',
  '| 1 | 2 |',
  '',
  '---',
  '',
  '危险链接 [点我](javascript:alert(1)) 不应成为链接。',
].join('\r\n')

const blocks = parseMarkdown(source)
const types = blocks.map((block) => block.type)
check('CRLF normalised, block order', types.join(',') === 'heading,paragraph,heading,list,list,quote,code,table,hr,paragraph', types)

const firstHeading = blocks[0]
check('h1 level', firstHeading.level === 1 && textOf(renderBlocks([firstHeading], 'x')) === '标题一')

const paragraph = blocks[1]
check('paragraph keeps one block', paragraph.type === 'paragraph' && paragraph.lines.length === 2, paragraph.lines?.length)
check('paragraph keeps its line break', textOf(renderBlocks([paragraph], 'x')).includes('\n段落的第二行'))
const paraTags = findAll(renderBlocks([paragraph], 'x'), 'strong')
check('strong parsed', paraTags.length === 1 && textOf(paraTags[0]) === '加粗')
check('em parsed', findAll(renderBlocks([paragraph], 'x'), 'em').length === 1)
check('code span parsed', findAll(renderBlocks([paragraph], 'x'), 'code').length === 1)
check('strike parsed', findAll(renderBlocks([paragraph], 'x'), 'del').length === 1)

const link = findAll(renderBlocks([paragraph], 'x'), 'a')[0]
check('safe link keeps href', link !== undefined && link.props.href === 'https://example.com', link?.props)
check('safe link opens a new tab', link !== undefined && link.props.target === '_blank' && link.props.rel.includes('noreferrer'))

// --- lists -------------------------------------------------------------------
const bullets = blocks[3]
check('bullet list is unordered', bullets.type === 'list' && bullets.ordered === false)
check('bullet count', bullets.items.length === 3, bullets.items.length)
check('nested one level', bullets.items[0].children[0]?.type === 'list' && bullets.items[0].children[0].items.length === 1)
check('nested two levels', bullets.items[0].children[0].items[0].children[0]?.type === 'list')
check('task unchecked', bullets.items[1].checkbox === false)
check('task checked', bullets.items[2].checkbox === true)
check('task text stripped of marker', bullets.items[2].text === '已完成', bullets.items[2].text)

const ordered = blocks[4]
check('ordered list', ordered.type === 'list' && ordered.ordered === true && ordered.items.length === 2)

const listTree = renderBlocks([bullets], 'l')
const taskBoxes = findAll(listTree, 'span').filter((node) => node.props.className === 'dsh-am-mdTaskBox')
check('task boxes rendered', taskBoxes.length === 2)
check('checked state carried', taskBoxes[0].props['data-checked'] === 'false' && taskBoxes[1].props['data-checked'] === 'true')

// --- quote, fence, table, rule ----------------------------------------------
const quote = blocks[5]
check('quote collected both lines', quote.blocks.length === 1 && textOf(renderBlocks([quote], 'q')).includes('引用第二行'))

const code = blocks[6]
check('fenced code keeps body and language', code.lang === 'js' && code.text === 'const a = 1', code)
const pre = findAll(renderBlocks([code], 'c'), 'pre')[0]
check('fence renders pre > code', pre !== undefined && pre.children[0]?.type === 'code')

const table = blocks[7]
check('table header cells', table.header.length === 2)
check('table rows', table.rows.length === 1 && table.rows[0].length === 2)
check('alignment from delimiter row', table.aligns[0] === 'left' && table.aligns[1] === 'right', table.aligns)
const th = findAll(renderBlocks([table], 't'), 'th')
check('th carries alignment', th[0].props.style?.textAlign === 'left' && th[1].props.style?.textAlign === 'right')
check('table wrapped for overflow', findAll(renderBlocks([table], 't'), 'div')[0].props.className === 'dsh-am-mdTableWrap')

check('horizontal rule', blocks[8].type === 'hr')
check('hr renders', findAll(renderBlocks([blocks[8]], 'r'), 'hr').length === 1)

// --- unsafe links ------------------------------------------------------------
const unsafe = blocks[9]
const anchors = findAll(renderBlocks([unsafe], 'u'), 'a')
check('javascript: link is not an anchor', anchors.length === 0, anchors.map((node) => node.props.href))
check('javascript: link text kept', textOf(renderBlocks([unsafe], 'u')).includes('点我'))

// --- edge cases --------------------------------------------------------------
check('empty document', parseMarkdown('').length === 0)
check('unterminated fence still renders', parseMarkdown('```\nabc').length === 1)
check('single star is literal', parseInline('2 * 3').every((node) => node.type === 'text'))
const inlineStrongEm = parseInline('**a *b* c**')
check('emphasis nested in strong', inlineStrongEm[0].type === 'strong' && inlineStrongEm[0].children.some((node) => node.type === 'em'))
check('heading needs a space', parseMarkdown('#nope')[0].type === 'paragraph')
check('table needs a delimiter row', parseMarkdown('| a | b |\n| x | y |')[0].type === 'paragraph')

// A pasted block of plain lines — the shape a rule file usually starts with.
const block = parseMarkdown(['<env>', 'maven:', '  home: D:\\develop\\env', 'jdk:', '  21: D:\\develop\\jdk', '</env>'].join('\n'))
check('plain block is one paragraph', block.length === 1 && block[0].type === 'paragraph', block.map((b) => b.type))
const blockText = textOf(renderBlocks(block, 'b'))
check('plain block keeps every line break', blockText.split('\n').length === 6, blockText)
check('plain block keeps indentation', blockText.includes('\n  home: D:\\develop\\env'), JSON.stringify(blockText))
check('angle brackets stay text', blockText.includes('<env>'))

// Trailing double spaces (a Markdown hard break) neither split the block nor leak.
const hard = parseMarkdown('第一行  \n第二行')
check('trailing spaces do not split the block', hard.length === 1)
check('trailing spaces are not rendered', !textOf(renderBlocks(hard, 'h')).includes('  \n'))

// --- a real rule file, when one is named -------------------------------------
const samplePath = process.argv[3]
if (samplePath !== undefined && existsSync(samplePath)) {
  const text = readFileSync(samplePath, 'utf8')
  const rendered = textOf(renderBlocks(parseMarkdown(text), 's'))
  const sourceLines = text.split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*+]|\d{1,9}[.)])\s+/, '').trim())
    .filter((line) => line !== '' && !/^(?:[-*_]{3,}|```|~~~)/.test(line))
  const missing = sourceLines.filter((line) => !rendered.includes(line))
  check(`real file keeps all ${sourceLines.length} lines`, missing.length === 0, missing.slice(0, 3))
  console.log(`     rendered lines: ${rendered.split('\n').length}`)
}

console.log(failures.length === 0 ? 'ALL PASSED' : `FAILURES: ${failures.length}`)
process.exit(failures.length === 0 ? 0 : 1)
