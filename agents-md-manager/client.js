window.__ModuleLoader__.load({
  id: '@local/agents-md-manager',
  factory(require) {
    const React = require('react')
    const { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } = React
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'agentsMd'
    /** The id shared by the sidebar entry and the main panel it opens. */
    const PANEL_ID = 'agents-md'
    /** The Host route base registered by index.js. */
    const API = '/agents-md'
    /** Where unsaved drafts survive leaving the page, per browser tab. */
    const STASH_KEY = 'agents-md-manager:drafts'

    /* -------------------------------------------------------------- locale */

    const zh = {
      panel: '行为规则',
      title: '行为规则',
      subtitle: '统一管理 DeepSeek Harness 遵循的规则：全局规则与各项目规则。',
      back: '返回会话',
      scopeLabel: '规则范围',
      globalRules: '全局规则',
      projectRules: '项目规则',
      projects: '项目',
      noProjects: '还没有项目',
      noProjectsHint: '在左侧新建或打开一个项目后，这里会列出该项目的 AGENTS.md。',
      loading: '正在读取…',
      loadFailed: '读取失败：{reason}',
      retry: '重试',
      notCreated: '未创建',
      exists: '已有内容',
      dirty: '未保存',
      save: '保存',
      saving: '保存中…',
      revert: '还原',
      saved: '已保存',
      unsaved: '有未保存的更改',
      clean: '与磁盘一致',
      placeholder: '# AGENTS.md\n\n写下这个范围下希望 Harness 始终遵守的规则。',
      preview: '预览',
      edit: '编辑',
      modeLabel: '显示方式',
      previewEmpty: '还没有内容，切换到编辑开始写。',
      previewFailed: '这段内容无法渲染，请切换到编辑查看原文。',
      emptyHint: '此文件还不存在，保存后会创建它。',
      editorLabel: 'AGENTS.md 内容：{scope}',
      conflictTitle: '文件已在磁盘上被修改',
      conflictHint: '保存前，请选择重新加载磁盘内容，或用当前编辑覆盖它。',
      reload: '重新加载',
      overwrite: '仍然覆盖保存',
      tooLarge: '文件超过 {max}，无法在页面内编辑。',
      unreadable: '文件存在但无法读取，请先用其他编辑器检查它。',
      directoryMissing: '项目目录不存在，无法保存。',
      lines: '{n} 行',
      chars: '{n} 字符',
      modified: '修改于 {when}',
      neverModified: '尚未创建',
      pathLabel: '路径',
      backHint: '返回会话（已保存的内容不受影响）',
      saveHint: '保存（Ctrl+S）',
      errConflict: '文件已被其他程序修改。',
      errTooLarge: '文件超过大小上限。',
      errDirectoryMissing: '项目目录不存在。',
      errUnknownWorkspace: '找不到这个项目。',
      errWriteFailed: '写入失败，请检查文件权限。',
      errReadFailed: '读取失败。',
      errNetwork: '无法连接 Harness。',
      errGeneric: '操作失败。',
      errContentType: '请求被拒绝。',
      errInvalid: '请求内容无效。',
    }

    const en = {
      panel: 'Behavior rules',
      title: 'Behavior rules',
      subtitle: 'One place for the rules DeepSeek Harness follows: the global rules and every project’s rules.',
      back: 'Back to session',
      scopeLabel: 'Rule scope',
      globalRules: 'Global rules',
      projectRules: 'Project rules',
      projects: 'Projects',
      noProjects: 'No projects yet',
      noProjectsHint: 'Create or open a project in the sidebar and its AGENTS.md appears here.',
      loading: 'Reading…',
      loadFailed: 'Could not read: {reason}',
      retry: 'Retry',
      notCreated: 'Not created',
      exists: 'Has content',
      dirty: 'Unsaved',
      save: 'Save',
      saving: 'Saving…',
      revert: 'Revert',
      saved: 'Saved',
      unsaved: 'Unsaved changes',
      clean: 'Matches disk',
      placeholder: '# AGENTS.md\n\nWrite the rules this scope should always follow.',
      preview: 'Preview',
      edit: 'Edit',
      modeLabel: 'View mode',
      previewEmpty: 'Nothing here yet — switch to Edit to start writing.',
      previewFailed: 'This content could not be rendered; switch to Edit to see the text.',
      emptyHint: 'This file does not exist yet; saving creates it.',
      editorLabel: 'AGENTS.md content: {scope}',
      conflictTitle: 'The file changed on disk',
      conflictHint: 'Reload the file from disk, or keep this draft and overwrite it.',
      reload: 'Reload',
      overwrite: 'Overwrite anyway',
      tooLarge: 'This file is larger than {max} and cannot be edited here.',
      unreadable: 'The file exists but could not be read. Check it in another editor.',
      directoryMissing: 'The project directory is missing, so it cannot be saved.',
      lines: '{n} lines',
      chars: '{n} chars',
      modified: 'Modified {when}',
      neverModified: 'Not created',
      pathLabel: 'Path',
      backHint: 'Back to the session (saved content is unaffected)',
      saveHint: 'Save (Ctrl+S)',
      errConflict: 'Another program changed this file.',
      errTooLarge: 'The file exceeds the size limit.',
      errDirectoryMissing: 'The project directory is missing.',
      errUnknownWorkspace: 'That project could not be found.',
      errWriteFailed: 'Write failed. Check the file permissions.',
      errReadFailed: 'The read failed.',
      errNetwork: 'Cannot reach the Harness.',
      errGeneric: 'The operation failed.',
      errContentType: 'The request was refused.',
      errInvalid: 'The request content was invalid.',
    }

    /* ------------------------------------------------------------ utilities */

    /** Replace `{name}` placeholders in one translated template. */
    function fmt(template, values) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) => (values[key] === undefined ? match : String(values[key])))
    }

    /** A byte count in the largest unit that keeps it readable. */
    function formatBytes(bytes) {
      const value = typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : 0
      if (value < 1024) return `${value} B`
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`
      return `${(value / (1024 * 1024)).toFixed(1)} MB`
    }

    /** A short local timestamp for the footer. */
    function formatWhen(millis) {
      if (typeof millis !== 'number' || !Number.isFinite(millis)) return ''
      const date = new Date(millis)
      const pad = (n) => String(n).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    /** How many lines the draft holds; an empty draft has none. */
    function lineCount(text) {
      if (text === '') return 0
      return text.split('\n').length
    }

    /** Whether a loaded document belongs to the given scope. */
    function docMatches(doc, selection) {
      if (doc === null || doc === undefined) return false
      return selection.kind === 'global'
        ? doc.scope === 'global'
        : doc.scope === 'project' && doc.workspaceId === selection.workspaceId
    }

    /** The stash key one selection owns; a draft survives leaving and returning. */
    function stashKeyOf(selection) {
      return selection.kind === 'global' ? 'global' : `project:${selection.workspaceId}`
    }

    /** Read the drafts this tab set aside, ignoring anything malformed. */
    function readStash() {
      try {
        const raw = sessionStorage.getItem(STASH_KEY)
        if (raw === null) return {}
        const parsed = JSON.parse(raw)
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
        const out = {}
        for (const key of Object.keys(parsed)) {
          if (typeof parsed[key] === 'string') out[key] = parsed[key]
        }
        return out
      } catch {
        return {}
      }
    }

    /** Keep this tab's drafts; an unavailable store leaves them in memory only. */
    function writeStash(map) {
      try {
        if (Object.keys(map).length === 0) sessionStorage.removeItem(STASH_KEY)
        else sessionStorage.setItem(STASH_KEY, JSON.stringify(map))
      } catch {
        /* storage blocked or full: the in-memory draft is still authoritative */
      }
    }

    /** Map a failure code from the Host onto localized copy. */
    function errorText(t, code) {
      switch (code) {
        case 'conflict': return t('errConflict')
        case 'too-large': return t('errTooLarge')
        case 'directory-missing': return t('errDirectoryMissing')
        case 'unknown-workspace': return t('errUnknownWorkspace')
        case 'write-failed': return t('errWriteFailed')
        case 'read-failed': return t('errReadFailed')
        case 'network': return t('errNetwork')
        case 'content-type-required':
        case 'body-too-large':
        case 'invalid-json':
        case 'invalid-scope':
        case 'workspace-required': return t('errContentType')
        case 'invalid-content':
        case 'invalid-request': return t('errInvalid')
        default: return t('errGeneric')
      }
    }

    /**
     * One Host call, with the failure code the page branches on. A non-JSON or
     * failed response becomes a code rather than an unhandled rejection.
     */
    async function callHost(path, init) {
      let response
      try {
        response = await fetch(API + path, init)
      } catch {
        const failure = new Error('network')
        failure.code = 'network'
        throw failure
      }
      let body = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok || body === null || typeof body.error === 'string') {
        const code = body !== null && typeof body.error === 'string' ? body.error : 'read-failed'
        const failure = new Error(code)
        failure.code = code
        if (body !== null && body.doc !== undefined) failure.doc = body.doc
        throw failure
      }
      return body
    }

    /* ------------------------------------------------------------- markdown */

    // A deliberately small Markdown reader for rule files: headings, paragraphs,
    // fences, lists (nested, with task marks), quotes, rules, pipe tables, and
    // the usual inline spans. It builds React elements from a parsed tree, never
    // HTML, so nothing in a rule file can inject markup into the page.

    const MD_HEADING = /^(#{1,6})\s+(.*)$/
    const MD_FENCE = /^\s*(```|~~~)\s*([\w+#.-]*)\s*$/
    const MD_HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/
    const MD_QUOTE = /^\s*>\s?(.*)$/
    const MD_BULLET = /^(\s*)[-*+]\s+(.*)$/
    const MD_ORDERED = /^(\s*)\d{1,9}[.)]\s+(.*)$/
    const MD_TABLE_DELIM = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

    // Backticks are written as \x60 so this source stays a plain quoted string.
    /** Markers a backslash may neutralise. */
    const MD_ESCAPABLE = /[\\`*_~[\]()#+\-.!>|]/

    /**
     * Read one `[text](href)` at an offset.
     *
     * @param source - the line being read.
     * @param start - index of the opening bracket.
     * @returns the link, with a null href when the scheme is not allowed, or null.
     */
    function readLinkAt(source, start) {
      const close = source.indexOf(']', start + 1)
      if (close < 0 || source[close + 1] !== '(') return null
      const end = source.indexOf(')', close + 2)
      if (end < 0) return null
      const href = source.slice(close + 2, end).trim()
      if (href === '' || /\s/.test(href)) return null
      return {
        text: source.slice(start + 1, close),
        // Only schemes a browser may follow from a document: a rule file must not
        // be able to smuggle in javascript: or a local file URL.
        href: /^(?:https?:|mailto:)/i.test(href) ? href : null,
        end: end + 1,
      }
    }

    /**
     * Read one delimited span such as `**bold**` or `*italic*`.
     *
     * @param source - the line being read.
     * @param start - index of the opening marker.
     * @param marker - the delimiter, one or two characters.
     * @returns the inner text and the offset after the span, or null.
     */
    function readDelimited(source, start, marker) {
      if (!source.startsWith(marker, start)) return null
      const doubled = marker.length === 2
      // A single marker never opens on the first half of a double run.
      if (!doubled && source.startsWith(marker, start + 1)) return null
      let search = start + marker.length
      while (search <= source.length) {
        const close = source.indexOf(marker, search)
        if (close < 0) return null
        const inner = source.slice(start + marker.length, close)
        const usable = inner !== '' && !/^\s/.test(inner) && !/\s$/.test(inner)
          // Nested emphasis may not reuse the surrounding delimiter run.
          && !(doubled && (inner.startsWith(marker[0]) || inner.endsWith(marker[0])))
        if (usable) {
          // Underscore emphasis never sits inside a word, so snake_case stays literal.
          if (marker[0] === '_') {
            const before = start === 0 ? '' : source[start - 1]
            const after = close + marker.length >= source.length ? '' : source[close + marker.length]
            if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)) {
              return { inner, end: close + marker.length }
            }
          } else {
            return { inner, end: close + marker.length }
          }
        }
        search = close + marker.length
      }
      return null
    }

    /**
     * Split one line of text into inline nodes.
     *
     * @param text - the source line.
     * @returns text, code, emphasis, strike, and link nodes.
     */
    function parseInline(text) {
      const source = String(text)
      const nodes = []
      let buffer = ''
      let i = 0
      const flush = () => {
        if (buffer === '') return
        nodes.push({ type: 'text', text: buffer })
        buffer = ''
      }
      const span = (type, inner) => {
        flush()
        nodes.push({ type, children: parseInline(inner) })
      }
      while (i < source.length) {
        const char = source[i]
        if (char === '\\' && i + 1 < source.length && MD_ESCAPABLE.test(source[i + 1])) {
          buffer += source[i + 1]
          i += 2
          continue
        }
        if (char === '\x60') {
          const end = source.indexOf('\x60', i + 1)
          if (end > i + 1) {
            flush()
            nodes.push({ type: 'code', text: source.slice(i + 1, end) })
            i = end + 1
            continue
          }
        }
        if (char === '!' && source[i + 1] === '[') {
          const image = readLinkAt(source, i + 1)
          if (image !== null) {
            // A rule file has no image store of its own: show the alt text.
            flush()
            nodes.push({ type: 'text', text: image.text })
            i = image.end
            continue
          }
        }
        if (char === '[') {
          const link = readLinkAt(source, i)
          if (link !== null) {
            flush()
            nodes.push({ type: 'link', href: link.href, children: parseInline(link.text) })
            i = link.end
            continue
          }
        }
        const strong = readDelimited(source, i, '**') ?? readDelimited(source, i, '__')
        if (strong !== null) {
          span('strong', strong.inner)
          i = strong.end
          continue
        }
        const strike = readDelimited(source, i, '~~')
        if (strike !== null) {
          span('strike', strike.inner)
          i = strike.end
          continue
        }
        const emphasis = readDelimited(source, i, '*') ?? readDelimited(source, i, '_')
        if (emphasis !== null) {
          span('em', emphasis.inner)
          i = emphasis.end
          continue
        }
        buffer += char
        i += 1
      }
      flush()
      return nodes
    }

    /** Whether a line opens a block, which ends a paragraph or a quote run. */
    function startsBlock(line) {
      return MD_HEADING.test(line) || MD_FENCE.test(line) || MD_HR.test(line)
        || MD_QUOTE.test(line) || MD_BULLET.test(line) || MD_ORDERED.test(line)
    }

    /** One table row's cells, without the optional outer pipes. */
    function tableCells(line) {
      let text = line.trim()
      if (text.startsWith('|')) text = text.slice(1)
      if (text.endsWith('|')) text = text.slice(0, -1)
      return text.split('|').map((cell) => cell.trim())
    }

    /** Column alignments from a table's delimiter row. */
    function tableAligns(line) {
      return tableCells(line).map((cell) => {
        const left = cell.startsWith(':')
        const right = cell.endsWith(':')
        if (left && right) return 'center'
        if (right) return 'right'
        return 'left'
      })
    }

    /**
     * Group consecutive list entries into one block, nesting by indentation.
     *
     * @param entries - collected entries with their indent, kind, and text.
     * @param index - first entry of this level.
     * @param indent - the indentation this level starts at.
     * @returns the list block and the index after its entries.
     */
    function buildList(entries, index, indent) {
      const items = []
      let i = index
      while (i < entries.length && entries[i].indent >= indent) {
        const entry = entries[i]
        if (entry.indent > indent) break
        const item = { text: entry.text, checkbox: entry.checkbox, children: [] }
        i += 1
        if (i < entries.length && entries[i].indent > indent) {
          const nested = buildList(entries, i, entries[i].indent)
          item.children.push(nested.block)
          i = nested.next
        }
        items.push(item)
      }
      return { block: { type: 'list', ordered: entries[index].ordered, items }, next: i }
    }

    /**
     * Parse a rule file into block nodes.
     *
     * @param text - the document text.
     * @returns the block list, ready for rendering.
     */
    function parseMarkdown(text) {
      const lines = String(text).replace(/\r\n?/g, '\n').split('\n')
      const blocks = []
      let i = 0
      while (i < lines.length) {
        const line = lines[i]
        if (line.trim() === '') {
          i += 1
          continue
        }

        const fence = MD_FENCE.exec(line)
        if (fence !== null) {
          const marker = fence[1]
          const lang = fence[2]
          const body = []
          i += 1
          while (i < lines.length && !lines[i].trim().startsWith(marker)) {
            body.push(lines[i])
            i += 1
          }
          if (i < lines.length) i += 1
          blocks.push({ type: 'code', lang, text: body.join('\n') })
          continue
        }

        const heading = MD_HEADING.exec(line)
        if (heading !== null) {
          blocks.push({ type: 'heading', level: heading[1].length, inline: parseInline(heading[2].trim()) })
          i += 1
          continue
        }

        if (MD_HR.test(line)) {
          blocks.push({ type: 'hr' })
          i += 1
          continue
        }

        if (MD_QUOTE.test(line)) {
          const inner = []
          while (i < lines.length) {
            const quoted = MD_QUOTE.exec(lines[i])
            if (quoted !== null) {
              inner.push(quoted[1])
              i += 1
              continue
            }
            // A lazy continuation line belongs to the quote until something else starts.
            if (lines[i].trim() !== '' && !startsBlock(lines[i]) && inner.length > 0 && inner[inner.length - 1].trim() !== '') {
              inner.push(lines[i])
              i += 1
              continue
            }
            break
          }
          blocks.push({ type: 'quote', blocks: parseMarkdown(inner.join('\n')) })
          continue
        }

        if (line.includes('|') && i + 1 < lines.length
          && lines[i + 1].includes('-') && MD_TABLE_DELIM.test(lines[i + 1])) {
          const header = tableCells(line).map(parseInline)
          const aligns = tableAligns(lines[i + 1])
          i += 2
          const rows = []
          while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
            rows.push(tableCells(lines[i]).map(parseInline))
            i += 1
          }
          blocks.push({ type: 'table', header, aligns, rows })
          continue
        }

        if (MD_BULLET.test(line) || MD_ORDERED.test(line)) {
          const entries = []
          while (i < lines.length) {
            const current = lines[i]
            if (current.trim() === '') break
            const bullet = MD_BULLET.exec(current)
            const ordered = MD_ORDERED.exec(current)
            if (bullet === null && ordered === null) break
            const bulletIndent = bullet === null ? null : bullet[1].replace(/\t/g, '    ').length
            const orderedIndent = ordered === null ? null : ordered[1].replace(/\t/g, '    ').length
            const raw = bullet !== null ? bullet[2] : ordered[2]
            const task = /^\[([ xX])\]\s+(.*)$/.exec(raw)
            entries.push({
              indent: bullet !== null ? bulletIndent : orderedIndent,
              ordered: ordered !== null,
              text: task !== null ? task[2] : raw,
              checkbox: task !== null ? task[1].toLowerCase() === 'x' : null,
            })
            i += 1
          }
          blocks.push(buildList(entries, 0, entries[0].indent).block)
          continue
        }

        const paragraph = []
        while (i < lines.length && lines[i].trim() !== '' && !startsBlock(lines[i])) {
          // Rule files are written line by line — an env block or a list of
          // paths keeps its own line breaks and indentation, so lines are kept
          // as written instead of being folded into one run of prose.
          paragraph.push(lines[i].replace(/\s+$/, ''))
          i += 1
        }
        blocks.push({ type: 'paragraph', lines: paragraph })
      }
      return blocks
    }

    /** Render inline nodes to React children. */
    function renderInline(nodes, prefix) {
      return nodes.map((node, index) => {
        const key = `${prefix}:${index}`
        switch (node.type) {
          case 'code':
            return h('code', { key }, node.text)
          case 'strong':
            return h('strong', { key }, renderInline(node.children, key))
          case 'em':
            return h('em', { key }, renderInline(node.children, key))
          case 'strike':
            return h('del', { key }, renderInline(node.children, key))
          case 'link':
            return node.href === null
              ? h('span', { key, className: 'dsh-am-mdPlainLink' }, renderInline(node.children, key))
              : h('a', { key, href: node.href, target: '_blank', rel: 'noreferrer noopener' },
                renderInline(node.children, key))
          default:
            return node.text
        }
      })
    }

    /** Render list entries, including any nested block under an entry. */
    function renderListItems(items, prefix) {
      return items.map((item, index) => {
        const key = `${prefix}:${index}`
        const body = renderInline(parseInline(item.text), key)
        const nested = item.children.length === 0 ? null : renderBlocks(item.children, `${key}:n`)
        if (item.checkbox === null) return h('li', { key }, body, nested)
        return h('li', { key, className: 'dsh-am-mdTask' },
          h('span', {
            className: 'dsh-am-mdTaskBox',
            'data-checked': item.checkbox ? 'true' : 'false',
            'aria-hidden': 'true',
          }),
          body,
          nested)
      })
    }

    /** Render block nodes to React children. */
    function renderBlocks(blocks, prefix) {
      return blocks.map((block, index) => {
        const key = `${prefix}:${index}`
        switch (block.type) {
          case 'heading': {
            const tag = `h${Math.min(6, Math.max(1, block.level))}`
            return h(tag, { key }, renderInline(block.inline, key))
          }
          case 'paragraph':
            // The newlines survive in the text node and `white-space: pre-wrap`
            // on the document renders them, so a pasted block keeps its shape.
            return h('p', { key }, renderInline(parseInline(block.lines.join('\n')), key))
          case 'code':
            return h('pre', { key }, h('code', null, block.text))
          case 'hr':
            return h('hr', { key })
          case 'quote':
            return h('blockquote', { key }, renderBlocks(block.blocks, key))
          case 'list':
            return h(block.ordered ? 'ol' : 'ul', { key }, renderListItems(block.items, key))
          case 'table':
            return h('div', { key, className: 'dsh-am-mdTableWrap' },
              h('table', null,
                h('thead', null, h('tr', null, block.header.map((cell, column) => h('th', {
                  key: column,
                  style: block.aligns[column] === undefined ? undefined : { textAlign: block.aligns[column] },
                }, renderInline(cell, `${key}:h${column}`))))),
                h('tbody', null, block.rows.map((row, rowIndex) => h('tr', { key: rowIndex },
                  row.map((cell, column) => h('td', {
                    key: column,
                    style: block.aligns[column] === undefined ? undefined : { textAlign: block.aligns[column] },
                  }, renderInline(cell, `${key}:${rowIndex}:${column}`)))))))) 
          default:
            return null
        }
      })
    }

    /* ----------------------------------------------------------------- icon */

    /** The sidebar glyph: two rule lobes split by a fissure and joined by a fold. */
    function PanelIcon({ size }) {
      const edge = typeof size === 'number' && size > 0 ? size : 16
      return h(
        'svg',
        {
          width: edge,
          height: edge,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.75,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        // Two lobes meeting at a notch top and bottom, split by the fissure and
        // joined by the fold that crosses it.
        h('path', {
          d: 'M8 2.55C9.3 1.5 10.1 1.3 10.9 1.45c2.6 1.05 4 3.45 4 6.55s-1.4 5.5-4 6.55c-.8.15-1.6-.05-2.9-1.1-1.3 1.05-2.1 1.25-2.9 1.1-2.6-1.05-4-3.45-4-6.55s1.4-5.5 4-6.55c.8-.15 1.6.05 2.9 1.1Z',
        }),
        h('path', { d: 'M8 2.75v10.5' }),
        h('path', { d: 'M4.85 8.75h6.3' }),
      )
    }

    /* ----------------------------------------------------------------- page */

    /**
     * Stand-in for the panel-selection hook when the registration supplies none:
     * this page is only mounted while its own panel is selected.
     *
     * @returns this plugin's panel id.
     */
    function useAlwaysActive() {
      return PANEL_ID
    }

    /** The module's one page: a scope rail beside the document it edits. */
    function Page(props) {
      // The injected face carries the bound translator; the fallback keeps a
      // registration without a dictionary readable instead of blanking the slot.
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const useActivePanel = typeof props.useActivePanel === 'function' ? props.useActivePanel : useAlwaysActive
      const activePanelId = useActivePanel()

      const [index, setIndex] = useState(null)
      const [indexError, setIndexError] = useState(null)
      const [selection, setSelection] = useState({ kind: 'global' })
      const [doc, setDoc] = useState(null)
      const [draft, setDraft] = useState('')
      const [drafts, setDrafts] = useState(readStash)
      const [docError, setDocError] = useState(null)
      const [docLoading, setDocLoading] = useState(true)
      const [saving, setSaving] = useState(false)
      const [actionError, setActionError] = useState(null)
      const [notice, setNotice] = useState(null)
      const [conflict, setConflict] = useState(null)
      // A rule file is written to be read, so the page opens on the rendered
      // document and the editor is one click away.
      const [mode, setMode] = useState('preview')

      const draftsRef = useRef(drafts)
      draftsRef.current = drafts
      const draftRef = useRef(draft)
      draftRef.current = draft
      const docRef = useRef(doc)
      docRef.current = doc
      const selectionRef = useRef(selection)
      selectionRef.current = selection
      const loadedRef = useRef(false)
      // Every load and save takes a ticket; a response whose ticket is stale is
      // dropped, so a slow request for a previous scope cannot land on this one.
      const requestRef = useRef(0)

      const currentKey = stashKeyOf(selection)
      const saved = doc !== null && doc.content !== undefined ? doc.content : ''
      const docInScope = doc !== null && docError === null && docMatches(doc, selection)
      const dirty = docInScope && draft !== saved
      const blocked = docInScope && (doc.readable === false || doc.tooLarge === true)

      // The window-level save shortcut reads these instead of re-binding itself.
      const dirtyRef = useRef(false)
      dirtyRef.current = dirty
      const savingRef = useRef(false)
      savingRef.current = saving
      const activeRef = useRef(activePanelId)
      activeRef.current = activePanelId

      /** Drop one stash entry. */
      const dropDraft = useCallback((key) => {
        setDrafts((current) => {
          if (current[key] === undefined) return current
          const next = { ...current }
          delete next[key]
          return next
        })
      }, [])

      /** Remember one stash entry. */
      const keepDraft = useCallback((key, text) => {
        setDrafts((current) => (current[key] === text ? current : { ...current, [key]: text }))
      }, [])

      /** Reload the scope list; a vanished project returns the page to the global file. */
      const loadIndex = useCallback(async () => {
        try {
          const body = await callHost('/index')
          setIndex(body)
          setIndexError(null)
          const projects = Array.isArray(body.projects) ? body.projects : []
          const current = selectionRef.current
          if (current.kind === 'project' && !projects.some((project) => project.id === current.workspaceId)) {
            setSelection({ kind: 'global' })
          }
          return body
        } catch (failure) {
          setIndexError(failure.code)
          return null
        }
      }, [])

      /**
       * Read one scope's document.
       *
       * @param target - the scope to load.
       * @param options - `silent` keeps the current pane while refreshing;
       *   `fromDisk` discards any stashed draft and takes what the Host reports.
       */
      const loadDoc = useCallback(async (target, options) => {
        const silent = options !== undefined && options.silent === true
        const fromDisk = options !== undefined && options.fromDisk === true
        const ticket = ++requestRef.current
        if (!silent) {
          setDocLoading(true)
          setDocError(null)
        }
        try {
          const query = target.kind === 'global'
            ? '?scope=global'
            : `?scope=project&workspaceId=${encodeURIComponent(target.workspaceId)}`
          const body = await callHost('/doc' + query)
          if (ticket !== requestRef.current) return null
          const next = body.doc
          const stashed = fromDisk ? undefined : draftsRef.current[stashKeyOf(target)]
          if (fromDisk) dropDraft(stashKeyOf(target))
          setDoc(next)
          setDraft(stashed === undefined ? next.content : stashed)
          setDocError(null)
          setConflict(null)
          return next
        } catch (failure) {
          if (ticket !== requestRef.current) return null
          setDocError(failure.code)
          return null
        } finally {
          if (ticket === requestRef.current) setDocLoading(false)
        }
      }, [dropDraft])

      useEffect(() => {
        let cancelled = false
        void (async () => {
          await loadIndex()
          if (!cancelled) loadedRef.current = true
        })()
        return () => {
          cancelled = true
        }
      }, [loadIndex])

      useEffect(() => {
        void loadDoc(selection)
      }, [selection, loadDoc])

      // This tab's drafts live in session storage, so leaving the page (which
      // unmounts the panel) does not throw them away.
      useEffect(() => {
        writeStash(drafts)
      }, [drafts])

      // A renderer that keeps the page mounted while another panel is selected
      // must pick up outside edits on return. A renderer that unmounts the page
      // remounts it instead, which loads afresh.
      const refreshRef = useRef(() => {})
      refreshRef.current = () => {
        void loadIndex()
        void loadDoc(selectionRef.current, { silent: true })
      }
      useEffect(() => {
        if (activePanelId !== PANEL_ID || loadedRef.current !== true) return
        refreshRef.current()
      }, [activePanelId])

      // A settled confirmation is not a permanent state: the file can be touched
      // again by another program while this page sits open.
      useEffect(() => {
        if (notice !== 'saved') return undefined
        const timer = setTimeout(() => { setNotice(null) }, 4000)
        return () => clearTimeout(timer)
      }, [notice])

      // Leaving the tab with unsaved text asks first.
      const hasUnsaved = dirty || Object.keys(drafts).length > 0
      useEffect(() => {
        if (!hasUnsaved) return undefined
        const guard = (event) => {
          event.preventDefault()
          event.returnValue = ''
          return ''
        }
        window.addEventListener('beforeunload', guard)
        return () => window.removeEventListener('beforeunload', guard)
      }, [hasUnsaved])

      /** Keep or drop the draft of the scope being left, then move to the next one. */
      const select = useCallback((next) => {
        const leaving = selectionRef.current
        const leavingDoc = docRef.current
        const text = draftRef.current
        if (docMatches(leavingDoc, leaving) && text !== leavingDoc.content) keepDraft(stashKeyOf(leaving), text)
        else dropDraft(stashKeyOf(leaving))
        setActionError(null)
        setNotice(null)
        setConflict(null)
        setSelection(next)
      }, [dropDraft, keepDraft])

      const save = useCallback(async (options) => {
        const force = options !== undefined && options.force === true
        const target = selectionRef.current
        const current = docRef.current
        if (!docMatches(current, target)) return
        if (current.readable === false || current.tooLarge === true) return
        const text = draftRef.current
        const ticket = ++requestRef.current
        setSaving(true)
        setActionError(null)
        setNotice(null)
        try {
          const body = await callHost('/save', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              scope: target.kind === 'global' ? 'global' : 'project',
              workspaceId: target.kind === 'global' ? undefined : target.workspaceId,
              content: text,
              expectedVersion: force ? undefined : current.version,
              force,
            }),
          })
          if (ticket !== requestRef.current) return
          setDoc(body.doc)
          setDraft(body.doc.content)
          setConflict(null)
          setNotice('saved')
          dropDraft(stashKeyOf(target))
        } catch (failure) {
          if (ticket !== requestRef.current) return
          if (failure.code === 'conflict' && failure.doc !== undefined) setConflict(failure.doc)
          else setActionError(failure.code)
        } finally {
          if (ticket === requestRef.current) setSaving(false)
        }
      }, [dropDraft])

      const revert = useCallback(() => {
        const target = selectionRef.current
        const current = docRef.current
        setDraft(current === null ? '' : current.content)
        setActionError(null)
        setNotice(null)
        setConflict(null)
        dropDraft(stashKeyOf(target))
      }, [dropDraft])

      const reloadFromDisk = useCallback(() => {
        setNotice(null)
        setActionError(null)
        void loadDoc(selectionRef.current, { fromDisk: true })
      }, [loadDoc])

      // Saving is the page's one steady action, so the shortcut works whether the
      // editor or the preview holds the screen.
      useEffect(() => {
        const onKeyDown = (event) => {
          // Only while this page is the one on screen, so a mounted-but-hidden
          // page never swallows another panel's save shortcut.
          if (activeRef.current !== PANEL_ID) return
          if (!(event.ctrlKey || event.metaKey) || event.altKey) return
          if (String(event.key).toLowerCase() !== 's') return
          event.preventDefault()
          if (dirtyRef.current && !savingRef.current) void save()
        }
        window.addEventListener('keydown', onKeyDown, true)
        return () => window.removeEventListener('keydown', onKeyDown, true)
      }, [save])

      const scopeKind = selection.kind === 'global' ? t('globalRules') : t('projectRules')
      const pathLabel = docInScope ? (doc.displayPath ?? doc.path) : ''
      const editorLabel = fmt(t('editorLabel'), {
        scope: docInScope ? `${scopeKind} · ${pathLabel}` : scopeKind,
      })

      const statusText = saving
        ? t('saving')
        : docLoading ? '' : (docInScope ? (dirty ? t('unsaved') : (notice === 'saved' ? t('saved') : t('clean'))) : '')
      const statusTone = dirty ? 'dirty' : (notice === 'saved' && !saving ? 'ok' : 'calm')

      const bytesNow = useMemo(() => {
        try {
          return new TextEncoder().encode(draft).length
        } catch {
          return draft.length
        }
      }, [draft])

      const globalEntry = index !== null && index.global !== undefined ? index.global : null
      const projects = index !== null && Array.isArray(index.projects) ? index.projects : []

      /** One rail row: the scope it opens, its file state, and that state for AT. */
      const railRow = (options) => {
        const active = options.active
        const state = options.dirty ? 'dirty' : options.exists ? 'exists' : 'absent'
        return h(
          'button',
          {
            key: options.key,
            type: 'button',
            className: active ? 'dsh-am-railRow dsh-am-railRowActive' : 'dsh-am-railRow',
            title: options.title,
            'aria-current': active ? 'page' : undefined,
            onClick: options.onClick,
          },
          h('span', { className: 'dsh-am-railName' }, options.label),
          h('span', { className: 'dsh-am-sr' }, `, ${options.stateLabel}`),
          h('span', { className: 'dsh-am-dot', 'data-state': state, 'aria-hidden': 'true' }),
        )
      }

      /** The document as the preview renders it; parsed only while previewing. */
      const preview = useMemo(() => {
        if (mode !== 'preview') return { blocks: null, failed: false }
        try {
          return { blocks: parseMarkdown(draft), failed: false }
        } catch {
          return { blocks: null, failed: true }
        }
      }, [mode, draft])

      const pane = () => {
        if (docLoading) return h('div', { className: 'dsh-am-placeholder' }, t('loading'))
        if (docError !== null) {
          return h('div', { className: 'dsh-am-placeholder' },
            h('span', { className: 'dsh-am-placeholderText' }, fmt(t('loadFailed'), { reason: errorText(t, docError) })),
            h('button', { type: 'button', className: 'dsh-am-btn', onClick: reloadFromDisk }, t('retry')))
        }
        if (!docInScope) {
          return h('div', { className: 'dsh-am-placeholder' },
            h('span', { className: 'dsh-am-placeholderText' }, t('errReadFailed')),
            h('button', { type: 'button', className: 'dsh-am-btn', onClick: reloadFromDisk }, t('retry')))
        }
        if (blocked) {
          const text = doc.tooLarge === true
            ? fmt(t('tooLarge'), { max: formatBytes(doc.maxBytes) })
            : t('unreadable')
          return h('div', { className: 'dsh-am-placeholder' }, h('span', { className: 'dsh-am-placeholderText' }, text))
        }
        if (mode === 'preview') {
          if (preview.failed) {
            return h('div', { className: 'dsh-am-placeholder' },
              h('span', { className: 'dsh-am-placeholderText' }, t('previewFailed')),
              h('button', { type: 'button', className: 'dsh-am-btn', onClick: () => setMode('edit') }, t('edit')))
          }
          if (draft.trim() === '') {
            return h('div', { className: 'dsh-am-placeholder' },
              h('span', { className: 'dsh-am-placeholderText' }, t('previewEmpty')),
              h('button', { type: 'button', className: 'dsh-am-btn', onClick: () => setMode('edit') }, t('edit')))
          }
          return h('div', { className: 'dsh-am-previewScroll' },
            h('article', { className: 'dsh-am-md dsh-am-mdDoc' }, renderBlocks(preview.blocks, 'md')))
        }
        return h('textarea', {
          className: 'dsh-am-editor',
          value: draft,
          // The editor mounts when the user switches to it, which is when it
          // should take the caret.
          autoFocus: true,
          spellCheck: false,
          autoComplete: 'off',
          autoCorrect: 'off',
          autoCapitalize: 'off',
          'aria-label': editorLabel,
          'aria-keyshortcuts': 'Control+S Meta+S',
          placeholder: t('placeholder'),
          onChange: (event) => {
            const text = event.target.value
            setDraft(text)
            setNotice(null)
            // Back to what is on disk: the rail must stop calling this unsaved.
            if (text === doc.content) dropDraft(currentKey)
            else keepDraft(currentKey, text)
          },
        })
      }

      return h('div', { className: 'dsh-am-root' },
        h('style', null, CSS),
        h('header', { className: 'dsh-am-head' },
          h('div', { className: 'dsh-am-headMain' },
            h('h1', { className: 'dsh-am-title' }, t('title')),
            h('p', { className: 'dsh-am-sub' }, t('subtitle'))),
          h('div', { className: 'dsh-am-headActions' },
            h('button', {
              type: 'button',
              className: 'dsh-am-btn dsh-am-btnGhost',
              title: t('backHint'),
              onClick: () => {
                if (typeof props.openConversation === 'function') props.openConversation()
              },
            },
            h('span', { className: 'dsh-am-chevron', 'aria-hidden': 'true' }, '\u2039'),
            t('back')))),
        h('div', { className: 'dsh-am-body' },
          h('nav', { className: 'dsh-am-rail', 'aria-label': t('scopeLabel') },
            h('div', { className: 'dsh-am-railTitle' }, t('scopeLabel')),
            indexError !== null
              ? h('div', { className: 'dsh-am-railError' },
                h('span', null, errorText(t, indexError)),
                h('button', { type: 'button', className: 'dsh-am-btn dsh-am-btnTiny', onClick: () => void loadIndex() }, t('retry')))
              : null,
            railRow({
              key: 'global',
              label: t('globalRules'),
              title: globalEntry === null
                ? t('globalRules')
                : `${t('globalRules')}\n${globalEntry.path}`,
              active: selection.kind === 'global',
              exists: globalEntry !== null && globalEntry.exists === true,
              dirty: drafts.global !== undefined,
              stateLabel: drafts.global !== undefined
                ? t('dirty')
                : (globalEntry !== null && globalEntry.exists === true ? t('exists') : t('notCreated')),
              onClick: () => select({ kind: 'global' }),
            }),
            h('div', { className: 'dsh-am-railTitle dsh-am-railTitleSpaced' }, t('projects')),
            projects.length === 0
              ? h('p', { className: 'dsh-am-railHint' }, t('noProjects'), h('br'), t('noProjectsHint'))
              : projects.map((project) => railRow({
                key: project.id,
                label: project.title,
                title: project.doc !== undefined
                  ? `${project.title}\n${project.doc.path}`
                  : `${project.title}\n${project.directory}`,
                active: selection.kind === 'project' && selection.workspaceId === project.id,
                exists: project.doc !== undefined && project.doc.exists === true,
                dirty: drafts[`project:${project.id}`] !== undefined,
                stateLabel: drafts[`project:${project.id}`] !== undefined
                  ? t('dirty')
                  : (project.doc !== undefined && project.doc.exists === true ? t('exists') : t('notCreated')),
                onClick: () => select({ kind: 'project', workspaceId: project.id, title: project.title }),
              }))),
          h('main', { className: 'dsh-am-content' },
            h('div', { className: 'dsh-am-contentHead' },
              h('div', { className: 'dsh-am-contentHeadMain' },
                h('p', { className: 'dsh-am-scope' }, scopeKind),
                h('h2', { className: 'dsh-am-docTitle' }, 'AGENTS.md'),
                h('p', { className: 'dsh-am-docPath', title: docInScope ? doc.path : '' },
                  h('span', { className: 'dsh-am-docPathLabel' }, t('pathLabel')),
                  h('span', { className: 'dsh-am-docPathValue' }, docInScope ? pathLabel : '—'),
                  docInScope && doc.exists !== true
                    ? h('span', { className: 'dsh-am-badge' }, t('notCreated'))
                    : null)),
              h('div', { className: 'dsh-am-contentActions' },
                h('div', { className: 'dsh-am-seg', role: 'group', 'aria-label': t('modeLabel') },
                  h('button', {
                    type: 'button',
                    className: 'dsh-am-segBtn',
                    'aria-pressed': mode === 'preview' ? 'true' : 'false',
                    onClick: () => setMode('preview'),
                  }, t('preview')),
                  h('button', {
                    type: 'button',
                    className: 'dsh-am-segBtn',
                    'aria-pressed': mode === 'edit' ? 'true' : 'false',
                    onClick: () => setMode('edit'),
                  }, t('edit'))),
                statusText === ''
                  ? null
                  : h('span', { className: 'dsh-am-status', role: 'status' },
                    h('span', { className: 'dsh-am-statusDot', 'data-tone': statusTone, 'aria-hidden': 'true' }),
                    statusText),
                h('button', {
                  type: 'button',
                  className: 'dsh-am-btn',
                  disabled: !dirty || saving || blocked,
                  onClick: revert,
                }, t('revert')),
                h('button', {
                  type: 'button',
                  className: 'dsh-am-btn dsh-am-btnPrimary',
                  title: t('saveHint'),
                  disabled: !dirty || saving || blocked,
                  onClick: () => void save(),
                }, saving ? t('saving') : t('save')))),
            conflict !== null
              ? h('div', { className: 'dsh-am-bar dsh-am-barWarn', role: 'alert' },
                h('div', { className: 'dsh-am-barBody' },
                  h('strong', { className: 'dsh-am-barTitle' }, t('conflictTitle')),
                  h('span', { className: 'dsh-am-barText' }, t('conflictHint'))),
                h('div', { className: 'dsh-am-barActions' },
                  h('button', { type: 'button', className: 'dsh-am-btn dsh-am-btnGhost', onClick: reloadFromDisk }, t('reload')),
                  h('button', {
                    type: 'button',
                    className: 'dsh-am-btn dsh-am-btnPrimary',
                    onClick: () => void save({ force: true }),
                  }, t('overwrite'))))
              : null,
            actionError !== null
              ? h('div', { className: 'dsh-am-bar dsh-am-barError', role: 'alert' },
                h('span', { className: 'dsh-am-barText' }, errorText(t, actionError)))
              : null,
            docInScope && doc.exists !== true && !blocked
              ? h('div', { className: 'dsh-am-bar dsh-am-barInfo' }, h('span', { className: 'dsh-am-barText' }, t('emptyHint')))
              : null,
            h('div', { className: 'dsh-am-editorWrap' }, pane()),
            h('footer', { className: 'dsh-am-foot' },
              h('span', { className: 'dsh-am-footStats' },
                fmt(t('lines'), { n: lineCount(draft) }),
                h('span', { className: 'dsh-am-sep' }, '·'),
                fmt(t('chars'), { n: draft.length }),
                h('span', { className: 'dsh-am-sep' }, '·'),
                formatBytes(bytesNow)),
              h('span', { className: 'dsh-am-footMeta' },
                docInScope
                  ? (doc.exists === true
                    ? fmt(t('modified'), { when: formatWhen(doc.modifiedAt) })
                    : t('neverModified'))
                  : '')))))
    }

    /* ------------------------------------------------------------------ css */

    const CSS = `
.dsh-am-root{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding-top:28px}
html[data-platform='darwin'] .dsh-am-root{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.dsh-am-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.dsh-am-head{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:0 clamp(24px,4vw,48px) 14px;flex:none}
.dsh-am-headMain{min-width:0}
.dsh-am-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.dsh-am-sub{margin:4px 0 0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.dsh-am-headActions{display:flex;align-items:center;gap:8px}
.dsh-am-chevron{font-size:15px;line-height:1;margin-right:2px}
.dsh-am-body{display:flex;flex:1;min-height:0;border-top:1px solid var(--dsw-alias-border-l3)}
.dsh-am-rail{box-sizing:border-box;width:232px;flex:none;display:flex;flex-direction:column;gap:2px;padding:10px 8px 28px;overflow:auto;border-right:1px solid var(--dsw-alias-border-l3);background:var(--dsw-specific-sidebar-fill)}
.dsh-am-railTitle{padding:6px 8px 4px;font-size:11px;line-height:16px;letter-spacing:.04em;color:var(--dsw-alias-label-secondary)}
.dsh-am-railTitleSpaced{padding-top:14px}
.dsh-am-railError{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px 8px 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)}
.dsh-am-railHint{margin:0;padding:2px 8px 6px;font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.dsh-am-railRow{position:relative;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;height:32px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.dsh-am-railRow:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-am-railRowActive,.dsh-am-railRowActive:hover{background:var(--dsw-specific-sidebar-nav-item-active);color:var(--dsw-alias-label-primary);font-weight:500}
.dsh-am-railName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-am-dot{flex:none;width:6px;height:6px;border-radius:50%;background:transparent;border:1px solid var(--dsw-alias-label-secondary)}
.dsh-am-dot[data-state='exists']{border-color:transparent;background:var(--dsw-alias-state-success-primary)}
.dsh-am-dot[data-state='dirty']{border-color:transparent;background:var(--dsw-alias-state-warn-primary)}
.dsh-am-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;padding:16px clamp(24px,4vw,48px) 16px}
.dsh-am-contentHead{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;flex:none}
.dsh-am-contentHeadMain{min-width:0}
.dsh-am-scope{margin:0;font-size:11px;line-height:16px;letter-spacing:.04em;color:var(--dsw-alias-label-secondary)}
.dsh-am-docTitle{margin:0;font-size:16px;font-weight:500;line-height:24px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code)}
.dsh-am-docPath{display:flex;align-items:center;gap:6px;margin:2px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);min-width:0}
.dsh-am-docPathLabel{flex:none;letter-spacing:.04em}
.dsh-am-docPathValue{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code)}
.dsh-am-badge{flex:none;padding:1px 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:14px;border:1px solid var(--dsw-alias-border-l3)}
.dsh-am-contentActions{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:8px;flex:none}
.dsh-am-seg{display:inline-flex;align-items:center;gap:2px;margin-right:auto;padding:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1)}
.dsh-am-segBtn{height:24px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1;white-space:nowrap;cursor:pointer}
.dsh-am-segBtn:hover{color:var(--dsw-alias-label-primary)}
.dsh-am-segBtn[aria-pressed='true']{background:var(--dsw-specific-sidebar-nav-item-active);color:var(--dsw-alias-label-primary);font-weight:500}
.dsh-am-segBtn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.dsh-am-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dsh-am-statusDot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-secondary)}
.dsh-am-statusDot[data-tone='dirty']{background:var(--dsw-alias-state-warn-primary)}
.dsh-am-statusDot[data-tone='ok']{background:var(--dsw-alias-state-success-primary)}
.dsh-am-btn{box-sizing:border-box;height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;white-space:nowrap;cursor:pointer}
.dsh-am-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-am-btn:disabled{opacity:.5;cursor:default}
.dsh-am-btn:disabled:hover{background:var(--dsw-alias-bg-layer-1)}
.dsh-am-btnTiny{height:24px;padding:0 8px;font-size:11px}
.dsh-am-btnGhost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center}
.dsh-am-btnGhost:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-am-btnPrimary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-weight:500}
.dsh-am-btnPrimary:hover{background:var(--dsw-alias-button-primary-hover)}
.dsh-am-btnPrimary:disabled{color:var(--dsw-alias-label-primary-foreground)}
.dsh-am-btnPrimary:disabled:hover{background:var(--dsw-alias-button-primary-fill)}
.dsh-am-btn:focus-visible,.dsh-am-railRow:focus-visible,.dsh-am-editor:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
.dsh-am-editor:focus-visible{outline-offset:-2px}
.dsh-am-bar{display:flex;align-items:center;flex-wrap:wrap;gap:10px;justify-content:space-between;padding:8px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);font-size:12px;line-height:18px;flex:none}
.dsh-am-barBody{display:flex;flex-direction:column;gap:1px;min-width:0}
.dsh-am-barTitle{font-size:12px;font-weight:600;line-height:18px}
.dsh-am-barText{color:var(--dsw-alias-label-secondary);min-width:0;overflow-wrap:anywhere}
.dsh-am-barActions{display:flex;gap:8px;flex:none}
.dsh-am-barWarn{border-color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary)}
.dsh-am-barWarn .dsh-am-barText{color:var(--dsw-alias-label-primary)}
.dsh-am-barError{border-color:var(--dsw-alias-state-error-primary)}
.dsh-am-barError .dsh-am-barText{color:var(--dsw-alias-state-error-primary)}
.dsh-am-barInfo{color:var(--dsw-alias-label-secondary)}
.dsh-am-editorWrap{flex:1;min-height:0;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.dsh-am-previewScroll{flex:1;min-height:0;overflow:auto;padding:24px clamp(20px,3vw,32px) 40px}
.dsh-am-mdDoc{font-size:var(--dsh-content-font-size,14px);line-height:1.7;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;white-space:pre-wrap}
.dsh-am-md>*:first-child{margin-top:0}
.dsh-am-md h1,.dsh-am-md h2,.dsh-am-md h3,.dsh-am-md h4,.dsh-am-md h5,.dsh-am-md h6{margin:1.5em 0 .55em;font-weight:600;line-height:1.32}
.dsh-am-md h1{font-size:1.6em}
.dsh-am-md h2{font-size:1.34em}
.dsh-am-md h3{font-size:1.16em}
.dsh-am-md h4,.dsh-am-md h5,.dsh-am-md h6{font-size:1em}
.dsh-am-md h5,.dsh-am-md h6{color:var(--dsw-alias-label-secondary)}
.dsh-am-md p{margin:.75em 0}
.dsh-am-md ul,.dsh-am-md ol{margin:.6em 0;padding-inline-start:1.5em}
.dsh-am-md li{margin:.25em 0}
.dsh-am-md li>ul,.dsh-am-md li>ol{margin:.2em 0}
.dsh-am-md li>p{margin:.2em 0}
.dsh-am-md code{font-family:var(--ds-font-family-code);font-size:.9em;padding:.1em .36em;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2)}
.dsh-am-md pre{margin:.85em 0;padding:12px 14px;overflow:auto;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2)}
.dsh-am-md pre code{padding:0;background:transparent;font-size:.88em;line-height:1.6}
.dsh-am-md blockquote{margin:.85em 0;padding:.1em 0 .1em 14px;border-inline-start:3px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary)}
.dsh-am-md blockquote>*:first-child{margin-top:0}
.dsh-am-md blockquote>*:last-child{margin-bottom:0}
.dsh-am-md a{color:var(--dsw-alias-brand-primary);text-decoration:none}
.dsh-am-md a:hover{text-decoration:underline}
.dsh-am-md .dsh-am-mdPlainLink{color:var(--dsw-alias-label-secondary)}
.dsh-am-md hr{margin:1.6em 0;border:0;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-am-md .dsh-am-mdTableWrap{margin:.9em 0;overflow-x:auto}
.dsh-am-md table{border-collapse:collapse;font-size:.94em}
.dsh-am-md th,.dsh-am-md td{border:1px solid var(--dsw-alias-border-l2);padding:6px 10px;vertical-align:top}
.dsh-am-md th{background:var(--dsw-alias-bg-layer-2);font-weight:600}
.dsh-am-md .dsh-am-mdTask{display:flex;align-items:flex-start;gap:8px;list-style:none;margin-inline-start:-1.2em}
.dsh-am-md .dsh-am-mdTaskBox{flex:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-top:.32em;border:1px solid var(--dsw-alias-border-l3);border-radius:4px;background:var(--dsw-alias-bg-layer-1)}
.dsh-am-md .dsh-am-mdTaskBox[data-checked='true']{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary)}
.dsh-am-md .dsh-am-mdTaskBox[data-checked='true']::after{content:'';width:7px;height:3.5px;margin-top:-1.5px;border-inline-start:1.6px solid var(--dsw-alias-label-primary-foreground);border-block-end:1.6px solid var(--dsw-alias-label-primary-foreground);transform:rotate(-45deg)}
.dsh-am-editor{flex:1;min-height:0;width:100%;box-sizing:border-box;padding:14px 16px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);font-size:13px;line-height:1.65;resize:none;tab-size:2}
.dsh-am-editor::placeholder{color:var(--dsw-alias-label-secondary)}
.dsh-am-placeholder{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.dsh-am-placeholderText{max-width:52ch}
.dsh-am-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dsh-am-footStats{display:inline-flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}
.dsh-am-footMeta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-am-sep{opacity:.6}
@media (max-width: 900px){
.dsh-am-body{flex-direction:column}
.dsh-am-rail{width:auto;flex:none;flex-direction:row;align-items:center;gap:6px;padding:8px 12px;overflow-x:auto;overflow-y:hidden;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l3)}
.dsh-am-railTitle,.dsh-am-railHint{display:none}
.dsh-am-railRow{width:auto;flex:none;max-width:220px;padding:0 10px}
.dsh-am-content{padding:12px clamp(16px,3vw,24px) 12px}
}
`

    /* --------------------------------------------------------------- plugin */

    /** The slots, dictionary, layout, and panel-state services this plugin needs. */
    const inject = ['slots', 'locale', 'layout']

    /**
     * Contribute the sidebar entry and the page it opens.
     *
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'agents-md-manager: dictionaries')
      const t = ctx.locale.bind(NS)
      const layout = ctx.layout
      const panelInfo = layout === undefined || layout === null ? null : layout.panelInfo

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({
              t,
              openConversation: () => {
                if (layout !== undefined && layout !== null) layout.selectPanel(null)
              },
              useActivePanel: () => useSyncExternalStore(
                (notify) => (panelInfo !== null && typeof panelInfo.subscribe === 'function'
                  ? panelInfo.subscribe(notify)
                  : () => {}),
                () => (panelInfo !== null && typeof panelInfo.getSnapshot === 'function'
                  ? panelInfo.getSnapshot().activePanelId
                  : PANEL_ID),
              ),
            }),
          },
          Page,
        ),
      )

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            // After the Plugins entry (0) and the task manager (10), beside any
            // user-installed entry at 20.
            order: 30,
            label: () => t('panel'),
            locale: NS,
          },
          PanelIcon,
        ),
      )
    }

    return {
      inject,
      apply,
      /** Pure helpers exported for this package's own tests, which run without a browser. */
      internals: { parseMarkdown, parseInline, renderBlocks },
    }
  },
})
