/**
 * Sidebar "collapse all workspaces" control.
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
    /** How long to wait for the host header before reporting it missing. */
    const ATTACH_TIMEOUT_MS = 15000

    const zh = { collapseAll: '收起全部工作区', collapsed: '已收起 {n} 个工作区' }
    const en = { collapseAll: 'Collapse all workspaces', collapsed: 'Collapsed {n} workspaces' }
    const ja = { collapseAll: 'すべてのワークスペースを折りたたむ', collapsed: '{n} 個のワークスペースを折りたたみました' }
    const es = { collapseAll: 'Contraer todos los espacios de trabajo', collapsed: 'Se contrajeron {n} espacios de trabajo' }
    const fr = { collapseAll: 'Réduire tous les espaces de travail', collapsed: '{n} espaces de travail réduits' }
    const de = { collapseAll: 'Alle Arbeitsbereiche einklappen', collapsed: '{n} Arbeitsbereiche eingeklappt' }
    const ru = { collapseAll: 'Свернуть все рабочие области', collapsed: 'Свёрнуто рабочих областей: {n}' }
    const pt = { collapseAll: 'Recolher todos os espaços de trabalho', collapsed: '{n} espaços de trabalho recolhidos' }

    /** The host's 16px icon box: a chevron folding up onto a baseline (collapse all). */
    const ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"'
      + ' fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M5 7.4 8 4.4l3 3"></path><path d="M4.5 11.6h7"></path></svg>'

    /**
     * Host icon-button geometry, limited to theme tokens so a renamed token
     * degrades appearance instead of breaking the control. Only the glyph is
     * dimmed when there is nothing to collapse, so the focus ring stays solid.
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
`

    /** Build the button element; the label is filled in by the caller. */
    function createButton() {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'dsh-collapse-all'
      button.setAttribute('data-dsh-collapse-all', '')
      button.innerHTML = ICON
      return button
    }

    return {
      inject: ['locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en, ja, es, fr, de, ru, pt }),
          'sidebar-collapse-all: dictionaries')
        const t = ctx.locale.bind(NS)

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
          let disposed = false
          let attached = false
          let frame = 0
          let overdue = 0

          /** Collapse every mounted expanded group; returns how many were folded. */
          const collapseAll = () => {
            const list = document.querySelector(LIST_SELECTOR)
            if (list === null) return 0
            const rows = [...list.querySelectorAll(EXPANDED_GROUP_SELECTOR)].reverse()
            let folded = 0
            for (const row of rows) {
              if (!row.isConnected) continue
              row.click()
              folded += 1
            }
            return folded
          }

          const paint = () => {
            const list = document.querySelector(LIST_SELECTOR)
            const empty = list === null || list.querySelector(EXPANDED_GROUP_SELECTOR) === null
            button.dataset.empty = String(empty)
            button.setAttribute('aria-disabled', String(empty))
            button.setAttribute('aria-label', t('collapseAll'))
            button.title = t('collapseAll')
            // Flat grouping has no groups to fold, and the section is titled "Sessions" there.
            const groups = list === null ? null : list.querySelector(GROUP_SELECTOR)
            button.dataset.hidden = String(groups === null)
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
            const folded = collapseAll()
            if (folded > 0) status.textContent = t('collapsed', { n: folded })
          })

          // Locale switches are published, not polled: repaint the label in place.
          const stopLocale = ctx.locale.subscribe(paint)
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
            status.remove()
            button.remove()
          }
        }, 'sidebar-collapse-all: header control')
      },
    }
  },
})
