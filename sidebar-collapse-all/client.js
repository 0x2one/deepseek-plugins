/**
 * Sidebar "collapse all workspaces" control, plus a running indicator on the
 * Workspace rows it deliberately leaves alone.
 *
 * The Workspace section header (title, search, view options, add workspace) is
 * rendered by `@deepseek-ai/dsh-client-ui-workspace` and exposes no slot of its
 * own in this release, so the control is attached to that header's DOM node (the
 * `data-sidebar-workspace-header` hook the host publishes) instead of a slot. It
 * copies the host's icon-button geometry and theme tokens, hides itself wherever
 * the host hides its own header actions (the 56px rail, the expanded search) and
 * where the section has no workspace groups at all (flat grouping), and
 * collapses groups by pressing the group rows' own toggles, so the persisted
 * view store stays the single writer.
 *
 * Workspaces with a running Session — and the one holding the current Session —
 * are never folded. A folded one shows a pulsing dot (and the count when more
 * than one Session runs) at the end of its row; an expanded group hides that
 * mark, since its own Session rows already carry their status. Both facts come
 * from the host's own Session/Workspace snapshots, not from row decoration, so
 * the rule holds for a collapsed group whose running Session rows are not
 * mounted.
 */
window.__ModuleLoader__.load({
  id: '@local/sidebar-collapse-all',
  factory() {
    /** Locale namespace owned by this plugin. */
    const NS = 'sidebarCollapseAll'
    /** The header node the host renders for the workspace/session browsing section. */
    const HEADER_SELECTOR = '[data-sidebar-workspace-header]'
    /** The section's own scroll/row seat; group rows only ever live inside it. */
    const LIST_SELECTOR = '[data-sidebar-list-area]'
    /** Any Workspace group row; absent in the flat (ungrouped) list mode. */
    const GROUP_SELECTOR = '[data-row-key^="workspace:"]'
    /** One expanded Workspace group row (includes the Ungrouped bucket). */
    const EXPANDED_GROUP_SELECTOR = '[data-row-key^="workspace:"][aria-expanded="true"]'
    /** A group row's trailing hover-action strip; the running mark sits before it. */
    const ROW_ACTIONS_SELECTOR = ':scope > [class*="rowActions"]'
    /** Prefix of a group row's `data-row-key`; the rest is the group key. */
    const GROUP_KEY_PREFIX = 'workspace:'
    /** Group key of the bucket holding Sessions outside every Workspace (ui-workspace's UNGROUPED_KEY). */
    const UNGROUPED_KEY = ''
    /** How long to wait for the host header before reporting it missing. */
    const ATTACH_TIMEOUT_MS = 15000

    const zh = {
      collapseAll: '收起全部工作区',
      collapseAllHint: '收起全部工作区，运行中或当前会话的工作区保持展开',
      collapsed: '已收起 {n} 个工作区',
      collapsedKeeping: '已收起 {n} 个工作区，{kept} 个保持展开',
      runningOne: '1 个会话运行中',
      runningMany: '{n} 个会话运行中',
    }
    const en = {
      collapseAll: 'Collapse all workspaces',
      collapseAllHint: 'Collapse all workspaces (running or current ones stay expanded)',
      collapsed: 'Collapsed {n} workspaces',
      collapsedKeeping: 'Collapsed {n} workspaces; {kept} kept expanded',
      runningOne: '1 session running',
      runningMany: '{n} sessions running',
    }
    const ja = {
      collapseAll: 'すべてのワークスペースを折りたたむ',
      collapseAllHint: 'すべてのワークスペースを折りたたむ（実行中と現在のものは展開したまま）',
      collapsed: '{n} 個のワークスペースを折りたたみました',
      collapsedKeeping: '{n} 個を折りたたみ、{kept} 個は展開したままにしました',
      runningOne: '1 件のセッションが実行中',
      runningMany: '{n} 件のセッションが実行中',
    }
    const es = {
      collapseAll: 'Contraer todos los espacios de trabajo',
      collapseAllHint: 'Contraer todos los espacios de trabajo (los activos y el actual siguen desplegados)',
      collapsed: 'Se contrajeron {n} espacios de trabajo',
      collapsedKeeping: 'Se contrajeron {n} espacios de trabajo; {kept} siguen desplegados',
      runningOne: '1 sesión en ejecución',
      runningMany: '{n} sesiones en ejecución',
    }
    const fr = {
      collapseAll: 'Réduire tous les espaces de travail',
      collapseAllHint: 'Réduire tous les espaces de travail (ceux en cours et l’actuel restent déployés)',
      collapsed: '{n} espaces de travail réduits',
      collapsedKeeping: '{n} espaces de travail réduits ; {kept} restent déployés',
      runningOne: '1 session en cours',
      runningMany: '{n} sessions en cours',
    }
    const de = {
      collapseAll: 'Alle Arbeitsbereiche einklappen',
      collapseAllHint: 'Alle Arbeitsbereiche einklappen (laufende und der aktuelle bleiben aufgeklappt)',
      collapsed: '{n} Arbeitsbereiche eingeklappt',
      collapsedKeeping: '{n} Arbeitsbereiche eingeklappt; {kept} bleiben aufgeklappt',
      runningOne: '1 Sitzung läuft',
      runningMany: '{n} Sitzungen laufen',
    }
    const ru = {
      collapseAll: 'Свернуть все рабочие области',
      collapseAllHint: 'Свернуть все рабочие области (выполняющиеся и текущая остаются развёрнутыми)',
      collapsed: 'Свёрнуто рабочих областей: {n}',
      collapsedKeeping: 'Свёрнуто рабочих областей: {n}; {kept} остались развёрнутыми',
      runningOne: 'Выполняется 1 сеанс',
      runningMany: 'Выполняется сеансов: {n}',
    }
    const pt = {
      collapseAll: 'Recolher todos os espaços de trabalho',
      collapseAllHint: 'Recolher todos os espaços de trabalho (os em execução e o atual ficam expandidos)',
      collapsed: '{n} espaços de trabalho recolhidos',
      collapsedKeeping: '{n} espaços de trabalho recolhidos; {kept} ficaram expandidos',
      runningOne: '1 sessão em execução',
      runningMany: '{n} sessões em execução',
    }

    /** The host's 16px icon box: a chevron folding up onto a baseline (collapse all). */
    const ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"'
      + ' fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M5 7.4 8 4.4l3 3"></path><path d="M4.5 11.6h7"></path></svg>'

    /**
     * Host icon-button geometry for the header control, and the group-row running
     * mark. Only theme tokens are used, so a renamed token degrades appearance
     * instead of breaking the control. The button's glyph is the only part dimmed
     * when there is nothing to collapse, so its focus ring stays solid.
     */
    const CSS = `
[data-sidebar-workspace-header] > .dsh-collapse-all {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
[data-sidebar-workspace-header] > .dsh-collapse-all:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -2px;
}
@media (hover: hover) {
  [data-sidebar-workspace-header] > .dsh-collapse-all:hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
[data-sidebar-workspace-header] > .dsh-collapse-all[data-empty='true'] > svg {
  opacity: 0.4;
}
[data-sidebar-workspace-header] > .dsh-collapse-all[data-hidden='true'] {
  display: none;
}
/* The rail drops the section label; the host leaves no room for extra actions there. */
[data-sidebar-workspace-header]:not(:has(> span)) > .dsh-collapse-all {
  display: none;
}
/* Expanded search takes the whole header and hides the host's action cluster. */
[data-sidebar-workspace-header]:has(input[tabindex='0']) > .dsh-collapse-all {
  display: none;
}
[data-sidebar-workspace-header] > .dsh-collapse-all-status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
/* Running mark at the end of a Workspace row: pulsing dot plus the running count. */
[data-sidebar-list-area] [data-row-key^='workspace:'] > .dsh-collapse-all-running {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--dsw-alias-state-business-primary);
  font-size: 12px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
/* The mark is a reminder for a folded group only: an open group already shows
   its own Session rows with their running status dots. */
[data-sidebar-list-area] [data-row-key^='workspace:'][aria-expanded='true'] > .dsh-collapse-all-running {
  display: none;
}
[data-sidebar-list-area] .dsh-collapse-all-running > .dsh-collapse-all-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: dsh-collapse-all-pulse 1.4s ease-in-out infinite;
}
@keyframes dsh-collapse-all-pulse {
  0%, 100% { opacity: 0.35; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  [data-sidebar-list-area] .dsh-collapse-all-running > .dsh-collapse-all-dot {
    animation: none;
    opacity: 0.9;
  }
}
`

    /** Build the header button; the label is filled in by the caller. */
    function createButton() {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'dsh-collapse-all'
      button.setAttribute('data-dsh-collapse-all', '')
      button.innerHTML = ICON
      return button
    }

    /** Build one Workspace row's running mark. */
    function createRunningMark() {
      const mark = document.createElement('span')
      mark.className = 'dsh-collapse-all-running'
      mark.setAttribute('role', 'img')
      const dot = document.createElement('span')
      dot.className = 'dsh-collapse-all-dot'
      mark.append(dot)
      return mark
    }

    /** The group key carried by one group row. */
    function rowGroupKey(row) {
      return (row.getAttribute('data-row-key') ?? '').slice(GROUP_KEY_PREFIX.length)
    }

    /** Whether one Workspace path sits inside another (the host's nesting rule). */
    function isAncestorPath(parent, child) {
      if (parent === '' || parent === child) return false
      return child.startsWith(parent + '\\') || child.startsWith(parent + '/')
    }

    return {
      inject: ['locale', 'sessions', 'workspaces'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en, ja, es, fr, de, ru, pt }),
          'sidebar-collapse-all: dictionaries')
        const t = ctx.locale.bind(NS)

        const sessions = ctx.get('sessions')
        const workspaces = ctx.get('workspaces')
        // Derived from the host snapshots; dropped whenever either one publishes.
        let cachedState = null

        /**
         * One pass over the host snapshots: the group keys that must stay
         * expanded (`keep`), and the running-Session count per group key
         * (`counts`).
         */
        const activeState = () => {
          if (cachedState !== null) return cachedState
          const keep = new Set()
          const counts = new Map()
          const runningRows = new Set()
          const active = new Set()
          const standaloneActive = new Set()
          const sessionState = sessions?.list?.getSnapshot?.()
          for (const [id, row] of Object.entries(sessionState?.byId ?? {})) {
            const isRunning = row?.running === true
            const isCurrent = (row?.retainedBy?.mainView ?? 0) > 0
            if (!isRunning && !isCurrent) continue
            active.add(id)
            // A subagent has no row of its own: it neither counts nor stands in the Ungrouped bucket.
            if (row?.origin !== 'subagent') {
              standaloneActive.add(id)
              if (isRunning) runningRows.add(id)
            }
          }
          const items = workspaces?.list?.getSnapshot?.()?.items ?? []
          const covered = new Set()
          for (const item of items) {
            let count = 0
            let holdsActive = false
            for (const id of item.sessionIds) {
              covered.add(id)
              if (runningRows.has(id)) count += 1
              if (active.has(id)) holdsActive = true
            }
            if (count > 0) counts.set(item.workspaceId, count)
            if (!holdsActive) continue
            keep.add(item.workspaceId)
            // Nested Workspaces sit under their ancestors: keep those open too, or the row hides.
            for (const other of items) {
              if (isAncestorPath(other.path, item.path)) keep.add(other.workspaceId)
            }
          }
          let ungroupedRunning = 0
          let ungroupedActive = false
          for (const id of standaloneActive) {
            if (covered.has(id)) continue
            ungroupedActive = true
            if (runningRows.has(id)) ungroupedRunning += 1
          }
          if (ungroupedRunning > 0) counts.set(UNGROUPED_KEY, ungroupedRunning)
          if (ungroupedActive) keep.add(UNGROUPED_KEY)
          cachedState = { keep, counts }
          return cachedState
        }

        ctx.effect(() => {
          const style = document.createElement('style')
          style.setAttribute('data-dsh-collapse-all-style', '')
          style.textContent = CSS
          document.head.append(style)
          return () => { style.remove() }
        }, 'sidebar-collapse-all: styles')

        ctx.effect(() => {
          const button = createButton()
          // Announce the outcome for screen readers; the folding list itself is the visual feedback.
          const status = document.createElement('span')
          status.className = 'dsh-collapse-all-status'
          status.setAttribute('role', 'status')
          status.setAttribute('aria-live', 'polite')
          /** group key -> the running mark currently mounted on its row. */
          const marks = new Map()
          let disposed = false
          let attached = false
          let frame = 0
          let overdue = 0

          /** Expanded group rows the button may fold: everything but protected workspaces. */
          const foldableRows = list => {
            const { keep } = activeState()
            return [...list.querySelectorAll(EXPANDED_GROUP_SELECTOR)]
              .filter(row => !keep.has(rowGroupKey(row)))
          }

          /** Collapse every foldable expanded group; reports what was folded and what was kept. */
          const collapseAll = () => {
            const list = document.querySelector(LIST_SELECTOR)
            if (list === null) return { folded: 0, kept: 0 }
            const kept = list.querySelectorAll(EXPANDED_GROUP_SELECTOR).length
            const rows = foldableRows(list).reverse()
            let folded = 0
            for (const row of rows) {
              if (!row.isConnected) continue
              row.click()
              folded += 1
            }
            return { folded, kept: kept - folded }
          }

          /** Keep one running mark per Workspace row with running Sessions; CSS shows it only while folded. */
          const paintMarks = list => {
            const { counts } = activeState()
            for (const [key, mark] of marks) {
              if (!counts.has(key) || !mark.isConnected) {
                mark.remove()
                marks.delete(key)
              }
            }
            if (counts.size === 0) return
            for (const row of list.querySelectorAll(GROUP_SELECTOR)) {
              const key = rowGroupKey(row)
              const count = counts.get(key)
              if (count === undefined) continue
              let mark = marks.get(key)
              if (mark === undefined) {
                mark = createRunningMark()
                marks.set(key, mark)
              }
              if (mark.parentElement !== row) {
                const actions = row.querySelector(ROW_ACTIONS_SELECTOR)
                if (actions !== null && actions.parentElement === row) row.insertBefore(mark, actions)
                else row.append(mark)
              }
              const label = t(count === 1 ? 'runningOne' : 'runningMany', { n: count })
              const countEl = mark.querySelector('.dsh-collapse-all-count')
              if (count > 1) {
                if (countEl === null) {
                  const created = document.createElement('span')
                  created.className = 'dsh-collapse-all-count'
                  created.textContent = String(count)
                  mark.append(created)
                } else if (countEl.textContent !== String(count)) {
                  countEl.textContent = String(count)
                }
              } else if (countEl !== null) {
                countEl.remove()
              }
              if (mark.getAttribute('aria-label') !== label) mark.setAttribute('aria-label', label)
              if (mark.getAttribute('title') !== label) mark.setAttribute('title', label)
            }
          }

          const paint = () => {
            const list = document.querySelector(LIST_SELECTOR)
            const empty = list === null || foldableRows(list).length === 0
            button.dataset.empty = String(empty)
            button.setAttribute('aria-disabled', String(empty))
            button.setAttribute('aria-label', t('collapseAll'))
            button.title = t('collapseAllHint')
            // Flat grouping has no groups to fold, and the section is titled "Sessions" there.
            const groups = list === null ? null : list.querySelector(GROUP_SELECTOR)
            button.dataset.hidden = String(groups === null)
            if (list !== null) paintMarks(list)
          }

          const sync = () => {
            frame = 0
            if (disposed) return
            const header = document.querySelector(HEADER_SELECTOR)
            if (header === null) return
            if (status.parentElement !== header) header.append(status)
            // Stay the rightmost control of the header's action cluster, even after a host re-render.
            if (button.parentElement !== header || header.lastElementChild !== button) header.append(button)
            if (!attached) {
              attached = true
              window.clearTimeout(overdue)
            }
            paint()
            // A hidden control must not keep focus: hand it to the search field when that is why it hid.
            if (document.activeElement === button && button.getClientRects().length === 0) {
              const field = header.querySelector('input')
              if (field !== null && field.tabIndex >= 0) field.focus()
              else button.blur()
            }
          }

          const schedule = () => {
            if (disposed || frame !== 0) return
            frame = window.requestAnimationFrame(sync)
          }

          button.addEventListener('click', () => {
            const { folded, kept } = collapseAll()
            if (folded === 0) return
            status.textContent = kept > 0
              ? t('collapsedKeeping', { n: folded, kept })
              : t('collapsed', { n: folded })
          })

          // Locale switches are published, not polled: repaint the label in place.
          const stopLocale = ctx.locale.subscribe(schedule)
          // Running/workspace changes invalidate the derived state and repaint.
          const invalidate = () => {
            cachedState = null
            schedule()
          }
          const stopSessions = sessions?.list?.subscribe?.(invalidate) ?? (() => {})
          const stopWorkspaces = workspaces?.list?.subscribe?.(invalidate) ?? (() => {})
          const observer = new MutationObserver(schedule)
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-expanded', 'tabindex'],
          })
          overdue = window.setTimeout(() => {
            if (!attached && !disposed) console.warn('[sidebar-collapse-all] workspace header not found')
          }, ATTACH_TIMEOUT_MS)
          sync()

          return () => {
            disposed = true
            if (frame !== 0) window.cancelAnimationFrame(frame)
            window.clearTimeout(overdue)
            observer.disconnect()
            stopLocale()
            stopSessions()
            stopWorkspaces()
            for (const mark of marks.values()) mark.remove()
            marks.clear()
            status.remove()
            button.remove()
          }
        }, 'sidebar-collapse-all: header control')
      },
    }
  },
})
