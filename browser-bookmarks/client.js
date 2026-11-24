window.__ModuleLoader__.load({
  id: '@local/browser-bookmarks',
  factory(require) {
    const React = require('react')
    const { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } = React
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'browserBookmarks'
    /** The id shared by the sidebar entry and the main panel it opens. */
    const PANEL_ID = 'browser-bookmarks'
    /** The Host route base registered by index.js. */
    const API = '/browser-bookmarks'

    /** Rail keys that are not category ids. */
    const ALL = 'all'
    const NONE = 'none'
    const STARRED = 'starred'

    const zh = {
      panel: '浏览器书签',
      title: '浏览器书签',
      subtitle: '管理浏览器书签：按分类整理，从本机浏览器导入，打开时自由选择浏览器。',
      summary: '{categories} 个分类 · {count} 条书签',
      search: '搜索标题或网址',
      categories: '分类',
      all: '全部',
      starred: '已星标',
      uncategorized: '未分类',
      newCategory: '新建分类',
      categoryPlaceholder: '分类名称',
      addBookmark: '新建书签',
      backup: '备份/恢复',
      backupTitle: '备份与恢复',
      backupHint: '备份会把当前的 {bookmarks} 条书签、{categories} 个分类保存成一个 JSON 文件；恢复会用备份文件覆盖当前全部数据，覆盖前会自动把现有数据另存一份快照。',
      backupDownload: '下载备份文件',
      restoreChoose: '选择备份文件…',
      restorePreview: '文件中有 {bookmarks} 条书签、{categories} 个分类，恢复后将覆盖当前数据。',
      restoreConfirm: '覆盖恢复',
      restoreDone: '已恢复 {bookmarks} 条书签、{categories} 个分类。',
      restoreSnapshot: '原数据快照：{path}',
      selectMode: '选择',
      exitSelect: '退出选择',
      selectAll: '全选',
      clearSelection: '清除选择',
      selectedCount: '已选 {n} 条',
      deleteSelected: '删除所选',
      confirmDeleteSelected: '确认删除 {n} 条',
      moveTo: '移动到',
      movePlaceholder: '选择分类…',
      moveToNew: '新建分类并移动',
      selectBookmark: '选择这条书签',
      star: '加星标',
      unstar: '取消星标',
      starSelected: '星标所选',
      unstarSelected: '取消所选星标',
      import: '导入',
      importTitle: '从本地浏览器导入',
      importHint: '读取浏览器自己的书签文件；已存在的网址会跳过，文件夹会成为分类。',
      importing: '导入中…',
      noSources: '没有找到可导入的浏览器书签文件。',
      firefoxHint: 'Chrome、Edge、Brave、Vivaldi、Opera 的书签文件可以直接读取；Firefox 的书签存放在 places.sqlite 中，暂不支持。',
      cancel: '取消',
      save: '保存',
      create: '创建',
      editTitle: '编辑书签',
      addTitle: '新建书签',
      edit: '编辑',
      delete: '删除',
      confirm: '确认删除',
      openWith: '打开方式',
      systemDefault: '系统默认浏览器',
      inAppBrowser: '内置浏览器（右侧栏）',
      defaultBrowser: '默认打开方式',
      titleField: '标题',
      titlePlaceholder: '例如 DeepSeek Harness 文档',
      urlField: '网址',
      urlPlaceholder: '例如 example.com/page',
      categoryField: '分类',
      loading: '加载中…',
      empty: '还没有书签。新建一条，或导入浏览器里已有的书签。',
      emptySearch: '没有匹配的书签。',
      emptyCategory: '这个分类下还没有书签。',
      imported: '已导入 {added} 条，跳过 {skipped} 条重复。',
      lastImport: '上次导入：{browser}（{profile}）',
      unavailable: '不可用',
      profile: '配置',
      rename: '重命名',
      dragHint: '拖动行首的手柄排序（或聚焦后按 Alt + ↑/↓）',
      dragHandle: '拖动排序',
      deleteCategoryHint: '删除分类，其中的书签会移到未分类',
      failed: '操作失败，请重试。',
      retry: '重试',
      errorInvalidUrl: '网址无效。',
      errorUrlRequired: '请输入网址。',
      errorBrowserUnavailable: '本机没有找到这个浏览器。',
      errorLaunchFailed: '浏览器没有启动，请检查它的安装是否完整。',
      errorInAppUnavailable: '内置浏览器不可用（右侧栏的浏览器未启用）。',
      errorInAppNoSession: '内置浏览器标签属于会话，请先打开一个会话。',
      errorInAppFailed: '内置浏览器没能打开这个页面。',
      errorInAppTarget: '内置浏览器只能在界面内打开。',
      errorUnknownBrowser: '未知的浏览器。',
      errorCategoryExists: '已存在同名分类。',
      errorSourceNotFound: '浏览器书签文件已变化，请重新打开导入。',
      errorBookmarkNotFound: '这条书签已不存在。',
      errorCategoryNotFound: '这个分类已不存在。',
      errorInvalidOrder: '分类顺序没能保存，请刷新后重试。',
      errorInvalidSelection: '所选内容无效，请重新选择。',
      errorInvalidBackup: '这个文件不是有效的备份。',
      errorFileReadFailed: '读取文件失败。',
      errorNameRequired: '请输入分类名称。',
      sourceUpdated: '更新于 {when}',
    }

    const en = {
      panel: 'Browser bookmarks',
      title: 'Browser bookmarks',
      subtitle: 'Your browsers’ bookmarks: sorted by category, imported locally, opened where you choose.',
      summary: '{count} bookmarks · {categories} categories',
      search: 'Search titles or addresses',
      categories: 'Categories',
      all: 'All',
      starred: 'Starred',
      uncategorized: 'Uncategorized',
      newCategory: 'New category',
      categoryPlaceholder: 'Category name',
      addBookmark: 'New bookmark',
      backup: 'Backup',
      backupTitle: 'Backup and restore',
      backupHint: 'Backup writes the current {bookmarks} bookmarks and {categories} categories to one JSON file. Restoring overwrites everything, and the current data is snapshotted first.',
      backupDownload: 'Download backup',
      restoreChoose: 'Choose a backup file…',
      restorePreview: 'The file holds {bookmarks} bookmarks and {categories} categories; restoring replaces the current data.',
      restoreConfirm: 'Restore and overwrite',
      restoreDone: 'Restored {bookmarks} bookmarks and {categories} categories.',
      restoreSnapshot: 'Previous data snapshot: {path}',
      selectMode: 'Select',
      exitSelect: 'Done',
      selectAll: 'Select all',
      clearSelection: 'Clear',
      selectedCount: '{n} selected',
      deleteSelected: 'Delete selected',
      confirmDeleteSelected: 'Delete {n}',
      moveTo: 'Move to',
      movePlaceholder: 'Choose a category…',
      moveToNew: 'Create category and move',
      selectBookmark: 'Select this bookmark',
      star: 'Add star',
      unstar: 'Remove star',
      starSelected: 'Star selected',
      unstarSelected: 'Unstar selected',
      import: 'Import',
      importTitle: 'Import from a local browser',
      importHint: 'Reads the browser’s own bookmark file; known addresses are skipped and folders become categories.',
      importing: 'Importing…',
      noSources: 'No importable browser bookmark file was found on this machine.',
      firefoxHint: 'Chrome, Edge, Brave, Vivaldi, and Opera bookmark files are read directly; Firefox keeps bookmarks in places.sqlite, which is not supported yet.',
      cancel: 'Cancel',
      save: 'Save',
      create: 'Create',
      editTitle: 'Edit bookmark',
      addTitle: 'New bookmark',
      edit: 'Edit',
      delete: 'Delete',
      confirm: 'Confirm',
      openWith: 'Open with',
      systemDefault: 'System default browser',
      inAppBrowser: 'In-app browser (sidebar)',
      defaultBrowser: 'Default browser',
      titleField: 'Title',
      titlePlaceholder: 'e.g. DeepSeek Harness docs',
      urlField: 'Address',
      urlPlaceholder: 'e.g. example.com/page',
      categoryField: 'Category',
      loading: 'Loading…',
      empty: 'No bookmarks yet. Add one, or import the ones your browser already has.',
      emptySearch: 'No bookmark matches this search.',
      emptyCategory: 'No bookmarks in this category yet.',
      imported: 'Imported {added}, skipped {skipped} duplicates.',
      lastImport: 'Last import: {browser} ({profile})',
      unavailable: 'unavailable',
      profile: 'profile',
      rename: 'Rename',
      dragHint: 'Drag the handle to reorder (or focus a row and press Alt + ↑/↓)',
      dragHandle: 'Drag to reorder',
      deleteCategoryHint: 'Deletes the category; its bookmarks move to Uncategorized',
      failed: 'That did not work. Please retry.',
      retry: 'Retry',
      errorInvalidUrl: 'That address is not valid.',
      errorUrlRequired: 'Enter an address.',
      errorBrowserUnavailable: 'This browser was not found on this machine.',
      errorLaunchFailed: 'The browser did not start; check that its installation is complete.',
      errorInAppUnavailable: 'The in-app browser is unavailable (the sidebar Browser is turned off).',
      errorInAppNoSession: 'In-app Browser tabs belong to a session; open a session first.',
      errorInAppFailed: 'The in-app browser could not open this page.',
      errorInAppTarget: 'The in-app browser opens only inside the UI.',
      errorUnknownBrowser: 'Unknown browser.',
      errorCategoryExists: 'A category with that name already exists.',
      errorSourceNotFound: 'The browser bookmark file changed; reopen the import panel.',
      errorBookmarkNotFound: 'That bookmark no longer exists.',
      errorCategoryNotFound: 'That category no longer exists.',
      errorInvalidOrder: 'The category order could not be saved; reload and retry.',
      errorInvalidSelection: 'That selection is not valid; select again.',
      errorInvalidBackup: 'That file is not a valid backup.',
      errorFileReadFailed: 'The file could not be read.',
      errorNameRequired: 'Enter a category name.',
      sourceUpdated: 'Updated {when}',
    }

    /** Fill `{name}` placeholders in one dictionary string. */
    function fmt(template, params) {
      let text = String(template)
      for (const key of Object.keys(params)) text = text.split(`{${key}}`).join(String(params[key]))
      return text
    }

    /** Localized text for a Host action failure code. */
    function errorText(t, code) {
      const keys = {
        'invalid-url': 'errorInvalidUrl',
        'url-required': 'errorUrlRequired',
        'browser-unavailable': 'errorBrowserUnavailable',
        'launch-failed': 'errorLaunchFailed',
        'in-app-unavailable': 'errorInAppUnavailable',
        'in-app-no-session': 'errorInAppNoSession',
        'in-app-failed': 'errorInAppFailed',
        'in-app-target': 'errorInAppTarget',
        'unknown-browser': 'errorUnknownBrowser',
        'category-exists': 'errorCategoryExists',
        'source-not-found': 'errorSourceNotFound',
        'bookmark-not-found': 'errorBookmarkNotFound',
        'category-not-found': 'errorCategoryNotFound',
        'invalid-order': 'errorInvalidOrder',
        'invalid-selection': 'errorInvalidSelection',
        'invalid-backup': 'errorInvalidBackup',
        'file-read-failed': 'errorFileReadFailed',
        'name-required': 'errorNameRequired',
      }
      const key = keys[code]
      return key === undefined ? t('failed') : t(key)
    }

    /* --------------------------------------------------------------- model */

    /**
     * The panel's one data source: the Host document, the detected browsers, and the
     * import sources, with the current request state on top. One snapshot object is
     * replaced per change so React can compare it by identity.
     */
    function createController() {
      let snapshot = {
        status: 'loading',
        state: null,
        browsers: [],
        sources: [],
        error: null,
        notice: null,
        busy: false,
      }
      const listeners = new Set()
      const emit = () => {
        for (const listener of listeners) listener()
      }
      const set = (patch) => {
        snapshot = { ...snapshot, ...patch }
        emit()
      }
      async function call(path, init) {
        const response = await fetch(API + path, init)
        let body = null
        try {
          body = await response.json()
        } catch {
          body = null
        }
        if (!response.ok || body === null || typeof body.error === 'string') {
          const failure = new Error(typeof body?.error === 'string' ? body.error : 'http-error')
          failure.code = typeof body?.error === 'string' ? body.error : 'failed'
          if (body !== null && body.state !== undefined) failure.state = body.state
          throw failure
        }
        return body
      }
      return {
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        get() {
          return snapshot
        },
        async load() {
          set({ status: 'loading', error: null })
          try {
            const [stateBody, sourcesBody] = await Promise.all([call('/state'), call('/sources')])
            set({
              status: 'ready',
              state: stateBody.state ?? null,
              browsers: Array.isArray(stateBody.browsers) ? stateBody.browsers : [],
              sources: Array.isArray(sourcesBody.sources) ? sourcesBody.sources : [],
              error: null,
            })
          } catch (failure) {
            set({ status: 'error', error: failure.code ?? 'failed' })
          }
        },
        async run(action, payload) {
          set({ busy: true, error: null, notice: null })
          try {
            const body = await call('/action', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ action, payload: payload ?? {} }),
            })
            set({
              busy: false,
              state: body.state ?? snapshot.state,
              browsers: Array.isArray(body.browsers) ? body.browsers : snapshot.browsers,
              notice: body.notice ?? null,
            })
            return body
          } catch (failure) {
            set({ busy: false, error: failure.code ?? 'failed', state: failure.state ?? snapshot.state })
            return null
          }
        },
      }
    }

    /** Read the mutable browser hosts the sidebar asks for. */
    function readHost(url) {
      try {
        const parsed = new URL(url)
        return parsed.hostname.replace(/^www\./, '')
      } catch {
        return url
      }
    }

    /** A stable decorative hue per site, so the same site keeps the same swatch. */
    function hueOf(text) {
      let hash = 0
      for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) % 360
      return hash
    }

    /** The name a user gave one browser profile, with its signed-in account when known. */
    function profileLabel(profile) {
      const name = typeof profile.name === 'string' && profile.name !== '' ? profile.name : profile.dir
      return typeof profile.account === 'string' && profile.account !== '' ? `${name} (${profile.account})` : name
    }

    /**
     * Every opening target, in browser order: the system default first, then one row per
     * browser profile, or one row per browser when it keeps a single unnamed profile.
     * The value is the wire form `browserId` or `browserId|profileDirectory`.
     */
    function buildTargets(browsers, t, inAppAvailable) {
      const targets = []
      if (inAppAvailable) targets.push({ value: 'in-app', label: t('inAppBrowser'), available: true })
      targets.push({ value: 'system', label: t('systemDefault'), available: true })
      for (const browser of browsers) {
        const profiles = Array.isArray(browser.profiles) ? browser.profiles : []
        if (profiles.length === 0) {
          targets.push({ value: browser.id, label: browser.name, available: browser.available })
          continue
        }
        for (const profile of profiles) {
          targets.push({
            value: `${browser.id}|${profile.dir}`,
            label: `${browser.name} · ${profileLabel(profile)}`,
            available: browser.available,
          })
        }
      }
      return targets
    }

    /** Split one target value into the browser id and profile directory it names. */
    function splitTarget(value) {
      const index = value.indexOf('|')
      return index < 0 ? { browserId: value, profile: null } : { browserId: value.slice(0, index), profile: value.slice(index + 1) }
    }

    /** Add one id to a selection list, or take it out when it is already there. */
    function toggleSelection(list, id) {
      return list.includes(id) ? list.filter((current) => current !== id) : [...list, id]
    }

    /** The rail view the panel opens on: the starred shelf when it holds anything. */
    function defaultView(bookmarks) {
      return bookmarks.some((bookmark) => bookmark.starred === true) ? STARRED : ALL
    }

    /** The bookmarks the page shows for one rail selection and one search needle. */
    function selectVisible(bookmarks, view, query) {
      const needle = String(query ?? '').trim().toLowerCase()
      return bookmarks.filter((bookmark) => {
        if (view === STARRED) {
          if (bookmark.starred !== true) return false
        } else if (view === NONE) {
          if (bookmark.categoryId !== null && bookmark.categoryId !== undefined) return false
        } else if (view !== ALL && bookmark.categoryId !== view) {
          return false
        }
        if (needle === '') return true
        return bookmark.title.toLowerCase().includes(needle) || bookmark.url.toLowerCase().includes(needle)
      })
    }

    /**
     * Place one category before or after another, keeping every other id in order.
     * Returns the input array itself when the move would change nothing.
     */
    function moveCategory(ids, fromId, toId, after) {
      if (fromId === toId) return ids
      const remaining = ids.filter((id) => id !== fromId)
      const target = remaining.indexOf(toId)
      if (target < 0) return ids
      remaining.splice(after === true ? target + 1 : target, 0, fromId)
      // A move that lands the id where it already was is not worth a request.
      return remaining.every((id, index) => id === ids[index]) ? ids : remaining
    }

    /** The stored default resolved to a target this machine can still offer. */
    function resolveDefaultTarget(settings, targets) {
      const browserId = typeof settings?.defaultBrowserId === 'string' ? settings.defaultBrowserId : 'system'
      if (browserId === 'system') return 'system'
      const stored = typeof settings?.defaultProfile === 'string' ? settings.defaultProfile : ''
      const exact = targets.find((target) => target.value === (stored === '' ? browserId : `${browserId}|${stored}`))
      if (exact !== undefined) return exact.value
      const firstOfBrowser = targets.find((target) => target.value === browserId || target.value.startsWith(`${browserId}|`))
      return firstOfBrowser === undefined ? 'system' : firstOfBrowser.value
    }

    /**
     * The Harness Web UI's own Browser tab, driven through the right Sidebar's
     * navigation controller. Optional: a profile without the right Sidebar simply
     * reports the target as unavailable.
     */
    function createInAppBrowser(ctx, options) {
      const sessionWaitMs = typeof options?.sessionWaitMs === 'number' ? options.sessionWaitMs : 4000
      let bridge = null
      let pendingError = null
      const kindOf = () => (bridge === null ? undefined : bridge.registry?.get?.('browser'))
      ctx.inject(['sidebarRight', 'sidebarRightTabs'], (scope) => {
        bridge = { service: scope.sidebarRight, registry: scope.sidebarRightTabs }
        scope.effect(() => () => {
          bridge = null
        })
      })

      /** The tab belongs to the Session on screen, so a global main panel must yield first. */
      const mountedSession = (service) => {
        const mounted = service.mounted
        if (mounted === undefined || typeof mounted.getSnapshot !== 'function') return undefined
        return mounted.getSnapshot()
      }

      return {
        available() {
          return bridge !== null && typeof bridge.service?.openTab === 'function' && kindOf() !== undefined
        },
        /** The failure the page could not display because it had already been unmounted. */
        takeError() {
          const value = pendingError
          pendingError = null
          return value
        },
        open(url) {
          if (bridge === null || typeof bridge.service?.openTab !== 'function') {
            return Promise.resolve({ ok: false, error: 'in-app-unavailable' })
          }
          if (kindOf() === undefined) return Promise.resolve({ ok: false, error: 'in-app-unavailable' })
          const { service } = bridge
          const attempt = () => service.openTab('browser', { params: { url } })
          try {
            if (mountedSession(service) !== undefined || service.mounted === undefined) {
              attempt()
              return Promise.resolve({ ok: true })
            }
          } catch {
            return Promise.resolve({ ok: false, error: 'in-app-failed' })
          }
          return new Promise((resolve) => {
            // One tab per click: the guard is claimed before the tab is opened, because
            // selecting the Conversation mounts the Session synchronously, which can fire
            // the subscription below and the check at the end of this block in turn.
            let done = false
            let unsubscribe = null
            let timer = null
            const cleanup = () => {
              if (typeof unsubscribe === 'function') unsubscribe()
              unsubscribe = null
              if (timer !== null) clearTimeout(timer)
              timer = null
            }
            const settle = (result) => {
              if (done) return
              done = true
              cleanup()
              resolve(result)
            }
            const openOnce = () => {
              if (done) return
              done = true
              cleanup()
              try {
                attempt()
                resolve({ ok: true })
              } catch {
                resolve({ ok: false, error: 'in-app-failed' })
              }
            }
            timer = setTimeout(() => {
              // Nothing mounted in time: come back to this panel and report it, because
              // the page that asked is gone by the time we know.
              pendingError = 'in-app-no-session'
              try {
                ctx.layout.selectPanel(PANEL_ID)
              } catch {
                /* the panel is registered by this same plugin; a failure here is harmless */
              }
              settle({ ok: false, error: 'in-app-no-session' })
            }, sessionWaitMs)
            const mounted = service.mounted
            if (typeof mounted.subscribe === 'function') {
              unsubscribe = mounted.subscribe(() => {
                if (mountedSession(service) !== undefined) openOnce()
              })
            }
            try {
              ctx.layout.selectPanel(null)
            } catch {
              settle({ ok: false, error: 'in-app-failed' })
              return
            }
            if (mountedSession(service) !== undefined) openOnce()
          })
        },
      }
    }

    /* ------------------------------------------------------------------ css */

    const CSS = `
.dsh-bm-root{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding-top:28px}
html[data-platform='darwin'] .dsh-bm-root{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.dsh-bm-head{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:0 clamp(20px,3vw,36px) 14px}
.dsh-bm-headMain{min-width:0}
.dsh-bm-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.dsh-bm-sub{margin:4px 0 0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.dsh-bm-headActions{display:flex;align-items:flex-end;flex-wrap:wrap;gap:8px}
.dsh-bm-field{display:flex;flex-direction:column;gap:4px}
.dsh-bm-fieldLabel{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsh-bm-input,.dsh-bm-select{box-sizing:border-box;height:30px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
.dsh-bm-select{max-width:200px;padding-right:6px}
.dsh-bm-input::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsh-bm-input:focus-visible,.dsh-bm-select:focus-visible,.dsh-bm-btn:focus-visible,.dsh-bm-iconBtn:focus-visible,.dsh-bm-card:focus-visible,.dsh-bm-railRow:focus-visible,.dsh-bm-source:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color);outline:none}
.dsh-bm-btn{box-sizing:border-box;height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;white-space:nowrap;cursor:pointer}
.dsh-bm-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-bm-btn:disabled{opacity:.55;cursor:default}
.dsh-bm-btn[aria-pressed='true']{border-color:transparent;background:var(--dsw-alias-brand-primary-soft);color:var(--dsw-alias-brand-primary);font-weight:500}
.dsh-bm-btnDanger{border-color:var(--dsw-alias-state-error-primary);background:transparent;color:var(--dsw-alias-state-error-primary);font-weight:500}
.dsh-bm-btnDanger:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}
.dsh-bm-btnPrimary{border-color:transparent;background:var(--dsw-alias-brand-primary-soft);color:var(--dsw-alias-brand-primary);font-weight:500}
.dsh-bm-btnSecondary{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}
.dsh-bm-btnSecondary:hover{color:var(--dsw-alias-label-primary)}
.dsh-bm-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsh-bm-iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-bm-iconBtnDanger:hover{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.dsh-bm-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:0 clamp(20px,3vw,36px) 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsh-bm-search{flex:1;max-width:360px}
.dsh-bm-notice{font-size:12px;line-height:18px;color:var(--dsw-alias-state-success-primary)}
.dsh-bm-errorText{font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)}
.dsh-bm-body{display:flex;flex:1;min-height:0}
.dsh-bm-rail{box-sizing:border-box;width:216px;flex:none;display:flex;flex-direction:column;gap:2px;padding:10px 8px 28px;overflow:auto;border-right:1px solid var(--dsw-alias-border-l1)}
.dsh-bm-railTitle{padding:6px 8px 4px;font-size:11px;line-height:16px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.dsh-bm-railRow{position:relative;box-sizing:border-box;display:flex;align-items:center;gap:6px;width:100%;height:30px;padding:0 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.dsh-bm-railRow:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-bm-railRowActive,.dsh-bm-railRowActive:hover{background:var(--dsw-specific-sidebar-nav-item-active);color:var(--dsw-alias-label-primary);font-weight:500}
.dsh-bm-railName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-bm-railCount{font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dsh-bm-railRowActive .dsh-bm-railCount{color:var(--dsw-alias-label-secondary)}
.dsh-bm-railTools{display:none;gap:2px}
.dsh-bm-railRow:hover .dsh-bm-railTools,.dsh-bm-railRow:focus-within .dsh-bm-railTools{display:flex}
.dsh-bm-railRow[draggable='true']{cursor:grab}
.dsh-bm-railGrip{flex:none;display:flex;align-items:center;justify-content:center;width:12px;height:22px;margin-left:-2px;color:var(--dsw-alias-label-tertiary);cursor:grab;opacity:0}
.dsh-bm-railRow:hover .dsh-bm-railGrip,.dsh-bm-railRow:focus-within .dsh-bm-railGrip{opacity:1}
.dsh-bm-railGrip:active{cursor:grabbing}
.dsh-bm-railRowDragging{opacity:.45}
.dsh-bm-railDropBefore{box-shadow:inset 0 2px 0 0 var(--dsw-alias-brand-primary)}
.dsh-bm-railDropAfter{box-shadow:inset 0 -2px 0 0 var(--dsw-alias-brand-primary)}
.dsh-bm-railHint{margin-top:-2px;padding:0 8px 2px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsh-bm-content{flex:1;min-width:0;overflow:auto;padding:14px clamp(20px,3vw,36px) 40px}
.dsh-bm-panel{display:flex;flex-direction:column;gap:10px;margin-bottom:14px;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.dsh-bm-restoreConfirm{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsh-bm-path{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.dsh-bm-panelHead{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dsh-bm-panelTitle{margin:0;font-size:13px;font-weight:500;line-height:20px}
.dsh-bm-panelHint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsh-bm-formActions{display:flex;justify-content:flex-end;gap:8px}
.dsh-bm-overlay{position:fixed;inset:0;z-index:60;box-sizing:border-box;display:flex;overflow:auto;overscroll-behavior:contain;padding:24px;background:rgb(0 0 0 / 34%)}
.dsh-bm-dialog{box-sizing:border-box;width:min(460px,100%);max-height:calc(100vh - 48px);margin:auto;display:flex;flex-direction:column;gap:16px;padding:20px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-overlay);box-shadow:0 24px 60px rgb(0 0 0 / 28%)}
.dsh-bm-dialogTitle{margin:0;font-size:15px;font-weight:600;line-height:22px}
.dsh-bm-dialogBody{display:flex;flex-direction:column;gap:12px}
.dsh-bm-dialogField{display:flex;flex-direction:column;gap:6px}
.dsh-bm-dialogField>.dsh-bm-input,.dsh-bm-dialogField>.dsh-bm-select{width:100%;max-width:none}
.dsh-bm-dialogLabel{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dsh-bm-dialogActions{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}
.dsh-bm-sources{display:flex;flex-direction:column;gap:6px}
.dsh-bm-source{box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.dsh-bm-source:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-bm-sourceActive{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary-soft)}
.dsh-bm-sourceBody{flex:1;min-width:0}
.dsh-bm-sourceName{display:block;overflow:hidden;font-size:13px;line-height:20px;text-overflow:ellipsis;white-space:nowrap}
.dsh-bm-sourceMeta{display:block;overflow:hidden;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap}
.dsh-bm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:10px}
.dsh-bm-card{position:relative;box-sizing:border-box;display:flex;align-items:flex-start;gap:10px;width:100%;min-height:64px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;text-align:left;cursor:pointer}
.dsh-bm-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.dsh-bm-avatar{flex:none;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;font-size:12px;font-weight:600;line-height:1}
.dsh-bm-cardBody{flex:1;min-width:0;padding-right:30px}
.dsh-bm-cardTitle{display:-webkit-box;overflow:hidden;font-size:13px;line-height:20px;word-break:break-word;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.dsh-bm-star{position:absolute;top:4px;right:6px;z-index:1;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;line-height:1;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dsh-bm-star:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-warn-primary)}
.dsh-bm-starOn,.dsh-bm-starOn:hover{color:var(--dsw-alias-state-warn-primary)}
.dsh-bm-cardHost{display:block;margin-top:2px;overflow:hidden;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap}
.dsh-bm-cardActions{position:absolute;top:4px;right:32px;display:none;gap:2px;padding:0 1px;border-radius:7px;background:var(--dsw-alias-bg-layer-2)}
.dsh-bm-cardGrip{cursor:grab}
.dsh-bm-cardGrip:active{cursor:grabbing}
.dsh-bm-cardDragging{opacity:.45}
.dsh-bm-cardDropBefore{box-shadow:inset 3px 0 0 0 var(--dsw-alias-brand-primary)}
.dsh-bm-cardDropAfter{box-shadow:inset -3px 0 0 0 var(--dsw-alias-brand-primary)}
.dsh-bm-card:hover .dsh-bm-cardActions,.dsh-bm-card:focus-within .dsh-bm-cardActions{display:flex}
.dsh-bm-check{flex:none;display:flex;align-items:center;justify-content:center;width:18px;height:18px;margin-top:5px;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;color:#fff;background:transparent}
.dsh-bm-cardSelected{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary-soft)}
.dsh-bm-cardSelected .dsh-bm-check{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary)}
.dsh-bm-bulk{position:sticky;bottom:0;z-index:2;display:flex;flex-direction:column;gap:8px;margin-top:16px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:0 -8px 24px rgb(0 0 0 / 12%)}
.dsh-bm-bulkRow{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.dsh-bm-bulkCount{font-size:13px;line-height:20px;font-weight:500;font-variant-numeric:tabular-nums}
.dsh-bm-bulkGap{flex:1;min-width:8px}
.dsh-bm-bulkLabel{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-bm-bulkNew{display:flex;align-items:center;gap:6px}
.dsh-bm-bulkNew .dsh-bm-input{width:150px;height:28px}
.dsh-bm-menuWrap{position:relative}
.dsh-bm-menu{position:fixed;z-index:40;box-sizing:border-box;width:220px;max-height:320px;overflow:auto;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 12px 28px rgb(0 0 0 / 18%)}
.dsh-bm-menuLabel{padding:4px 10px 6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsh-bm-menuItem{display:block;box-sizing:border-box;width:100%;height:30px;padding:0 10px;overflow:hidden;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:30px;text-align:left;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.dsh-bm-menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-bm-menuItem:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}
.dsh-bm-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:72px 24px;text-align:center;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.dsh-bm-empty strong{font-size:14px;font-weight:500;color:var(--dsw-alias-label-secondary)}
.dsh-bm-empty svg{color:var(--dsw-alias-label-tertiary)}
`

    /* ---------------------------------------------------------------- icons */

    function icon(paths, size) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        paths.map((path, index) => h('path', { key: index, d: path })),
      )
    }

    /** The sidebar glyph: a bookmark ribbon, drawn for the size the sidebar asks for. */
    function PanelIcon({ size = 18 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('path', {
          d: 'M6.75 4.25h10.5a1.5 1.5 0 0 1 1.5 1.5v14.1a.75.75 0 0 1-1.16.63L12 16.9l-5.59 3.58a.75.75 0 0 1-1.16-.63V5.75a1.5 1.5 0 0 1 1.5-1.5Z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M9.25 8.75h5.5', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
      )
    }

    const ICON_CARET = ['M7 10l5 5 5-5']
    const ICON_PEN = ['M4.75 19.25l4.2-.9 9.6-9.6a1.6 1.6 0 0 0 0-2.26l-1.04-1.04a1.6 1.6 0 0 0-2.26 0l-9.6 9.6-.9 4.2Z']
    const ICON_TRASH = ['M5.5 7.5h13', 'M9.5 7.5V5.75h5V7.5', 'M7.25 7.5l.7 11.2h8.1l.7-11.2']
    const ICON_PLUS = ['M12 5.5v13', 'M5.5 12h13']
    const ICON_CLOSE = ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11']
    const ICON_CHECK = ['M5.25 12.5l4.5 4.5L18.75 7.5']

    /** The star that marks one bookmark as one the user keeps close. */
    function StarIcon(filled) {
      return h(
        'svg',
        {
          width: 14,
          height: 14,
          viewBox: '0 0 24 24',
          fill: filled ? 'currentColor' : 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('path', { d: 'M12 4.6l2.32 4.7 5.18.76-3.75 3.66.89 5.16L12 16.44l-4.64 2.44.89-5.16L4.5 10.06l5.18-.76L12 4.6Z' }),
      )
    }

    /** The rail's drag handle: two columns of three dots. */
    function GripIcon() {      return h(
        'svg',
        { width: 10, height: 14, viewBox: '0 0 10 14', fill: 'currentColor', 'aria-hidden': 'true', focusable: 'false' },
        [
          [3, 3],
          [7, 3],
          [3, 7],
          [7, 7],
          [3, 11],
          [7, 11],
        ].map(([cx, cy]) => h('circle', { key: `${cx}-${cy}`, cx, cy, r: 1.2 })),
      )
    }

    /* ----------------------------------------------------------------- page */

    /**
     * One bookmark tile. Normally the whole tile opens with the default browser and the
     * caret offers every browser for that one opening; in selection mode the tile becomes
     * a checkbox and the per-tile actions step aside.
     */
    function BookmarkCard(props) {
      const { t, bookmark, pending, busy, open, edit, remove, selecting, selected, onToggleSelect, drag } = props
      const hue = hueOf(bookmark.url)
      const initial = (bookmark.title || bookmark.url).trim().charAt(0)
      const classes = ['dsh-bm-card']
      if (selecting === true) {
        classes.push('dsh-bm-cardSelecting')
        if (selected === true) classes.push('dsh-bm-cardSelected')
      }
      if (drag?.active === true) classes.push('dsh-bm-cardDragging')
      if (drag?.position === 'before') classes.push('dsh-bm-cardDropBefore')
      if (drag?.position === 'after') classes.push('dsh-bm-cardDropAfter')
      const activate = () => {
        if (selecting === true) {
          onToggleSelect(bookmark.id)
          return
        }
        open(bookmark.url, null)
      }
      return h(
        'div',
        {
          className: classes.join(' '),
          role: selecting === true ? 'checkbox' : 'button',
          'aria-checked': selecting === true ? (selected === true ? 'true' : 'false') : undefined,
          tabIndex: 0,
          title: selecting === true ? bookmark.title : bookmark.url,
          'aria-label': selecting === true ? `${t('selectBookmark')}: ${bookmark.title}` : `${bookmark.title} — ${t('openWith')}`,
          onClick: activate,
          onDragOver: (event) => {
            if (selecting !== true) props.onCardDragOver(bookmark.id, event)
          },
          onDragLeave: (event) => {
            if (selecting !== true) props.onCardDragLeave(bookmark.id, event)
          },
          onDrop: (event) => {
            if (selecting !== true) props.onCardDrop(bookmark.id, event)
          },
          onKeyDown: (event) => {
            // Buttons inside the tile own their own keys; only the tile itself acts.
            if (event.target !== event.currentTarget) return
            if (selecting !== true && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
              event.preventDefault()
              props.onMoveBy(bookmark.id, event.key === 'ArrowUp' ? -1 : 1)
              return
            }
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              activate()
            }
          },
        },
        // While selecting, the leading cell is the checkbox; the top-right corner stays
        // reserved for the hover actions.
        selecting === true
          ? h('span', { className: 'dsh-bm-check', 'aria-hidden': 'true' }, selected === true ? icon(ICON_CHECK, 12) : null)
          : null,
        h(
          'span',
          {
            className: 'dsh-bm-avatar',
            style: { background: `hsl(${hue} 72% 92%)`, color: `hsl(${hue} 48% 34%)` },
            'aria-hidden': 'true',
          },
          initial,
        ),
        h(
          'span',
          { className: 'dsh-bm-cardBody' },
          h('span', { className: 'dsh-bm-cardTitle' }, bookmark.title),
          h('span', { className: 'dsh-bm-cardHost' }, readHost(bookmark.url)),
        ),
        // The star owns the top-right corner permanently; the hover actions sit to its
        // left, so neither ever covers the other.
        selecting === true
          ? null
          : h(
              'button',
              {
                type: 'button',
                className: bookmark.starred === true ? 'dsh-bm-star dsh-bm-starOn' : 'dsh-bm-star',
                'aria-pressed': bookmark.starred === true ? 'true' : 'false',
                'aria-label': bookmark.starred === true ? t('unstar') : t('star'),
                title: bookmark.starred === true ? t('unstar') : t('star'),
                onClick: (event) => {
                  event.stopPropagation()
                  props.onStar(bookmark)
                },
              },
              StarIcon(bookmark.starred === true),
            ),
        selecting === true
          ? null
          : h(
              'span',
              { className: 'dsh-bm-cardActions', onClick: (event) => event.stopPropagation() },
              // Drag starts here, never on the tile: a draggable tile swallows the
              // click that opens the bookmark.
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-bm-iconBtn dsh-bm-cardGrip',
                  draggable: true,
                  'aria-label': t('dragHandle'),
                  title: t('dragHandle'),
                  onClick: (event) => event.stopPropagation(),
                  onDragStart: (event) => props.onCardDragStart(bookmark.id, event),
                  onDragEnd: () => props.onCardDragEnd(),
                },
                GripIcon(),
              ),
              h(
                'span',
                { className: 'dsh-bm-menuWrap' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-bm-iconBtn',
                    'aria-label': t('openWith'),
                    title: t('openWith'),
                    disabled: busy,
                    onClick: (event) => props.onMenu(bookmark.id, event.currentTarget),
                  },
                  icon(ICON_CARET, 14),
                ),
                props.menuOpen ? props.renderBrowserMenu(bookmark.url, () => props.onMenu(null), props.menuPosition) : null,
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-bm-iconBtn',
                  'aria-label': t('edit'),
                  title: t('edit'),
                  onClick: () => edit(bookmark),
                },
                icon(ICON_PEN, 14),
              ),
              pending
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-bm-btn dsh-bm-btnPrimary',
                      onClick: () => remove(bookmark.id),
                    },
                    t('confirm'),
                  )
                : h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-bm-iconBtn dsh-bm-iconBtnDanger',
                      'aria-label': t('delete'),
                      title: t('delete'),
                      onClick: () => props.onAskDelete(bookmark.id),
                    },
                    icon(ICON_TRASH, 14),
                  ),
            ),
      )
    }

    /** The full panel page: rail of categories, toolbar, and the bookmark grid. */
    function Page(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const controller = props.controller
      const inApp = props.inApp
      const snapshot = useSyncExternalStore(controller.subscribe, controller.get)
      const state = snapshot.state
      const categories = state?.categories ?? []
      const bookmarks = state?.bookmarks ?? []
      const browsers = snapshot.browsers ?? []
      const categoryIds = categories.map((category) => category.id)

      const [query, setQuery] = useState('')
      const [activeCategory, setActiveCategory] = useState(ALL)
      const [form, setForm] = useState(null)
      const [importOpen, setImportOpen] = useState(false)
      const [sourceId, setSourceId] = useState(null)
      const [renaming, setRenaming] = useState(null)
      const [creating, setCreating] = useState(null)
      const [menu, setMenu] = useState(null)
      const [deleteId, setDeleteId] = useState(null)
      const [inAppError, setInAppError] = useState(null)
      const [draggingId, setDraggingId] = useState(null)
      const [dropTarget, setDropTarget] = useState(null)
      const [draggingCardId, setDraggingCardId] = useState(null)
      const [cardDropTarget, setCardDropTarget] = useState(null)
      const [selecting, setSelecting] = useState(false)
      const [selected, setSelected] = useState([])
      const [bulkConfirm, setBulkConfirm] = useState(false)
      const [newCategoryName, setNewCategoryName] = useState('')
      const [backupOpen, setBackupOpen] = useState(false)
      const [restoreDraft, setRestoreDraft] = useState(null)
      const [restoreResult, setRestoreResult] = useState(null)
      const [restoreError, setRestoreError] = useState(null)
      const fileRef = useRef(null)
      const openingDefaultRef = useRef(false)
      const openerRef = useRef(null)

      useEffect(() => {
        controller.load()
      }, [controller])

      // The panel opens on the starred shelf, once, as soon as the library is known; a
      // library with no stars opens on all bookmarks instead of an empty page.
      useEffect(() => {
        if (openingDefaultRef.current) return
        if (snapshot.status !== 'ready' || state === null) return
        openingDefaultRef.current = true
        const next = defaultView(bookmarks)
        if (next !== ALL) setActiveCategory(next)
      }, [snapshot.status, state, bookmarks])

      // A failure that arrived after this page was unmounted for the Conversation.
      useEffect(() => {
        if (inApp === undefined || typeof inApp.takeError !== 'function') return
        const pending = inApp.takeError()
        if (pending !== null && pending !== undefined) setInAppError(pending)
      }, [inApp])

      useEffect(() => {
        if (menu === null) return undefined
        const close = () => setMenu(null)
        const onPointerDown = (event) => {
          if (event.target instanceof Element && event.target.closest('.dsh-bm-menuWrap') !== null) return
          close()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') close()
        }
        document.addEventListener('mousedown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        window.addEventListener('scroll', close, true)
        window.addEventListener('resize', close)
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
          window.removeEventListener('scroll', close, true)
          window.removeEventListener('resize', close)
        }
      }, [menu])

      useEffect(() => {
        if (deleteId === null) return undefined
        const timer = setTimeout(() => setDeleteId(null), 4000)
        return () => clearTimeout(timer)
      }, [deleteId])

      // Selection mode is a mode: Escape leaves it, and a shrinking list drops the
      // selections it no longer contains.
      useEffect(() => {
        if (!selecting) return undefined
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          setSelecting(false)
          setSelected([])
          setBulkConfirm(false)
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [selecting])

      useEffect(() => {
        if (selected.length === 0) return
        const alive = new Set(bookmarks.map((bookmark) => bookmark.id))
        const next = selected.filter((id) => alive.has(id))
        if (next.length !== selected.length) setSelected(next)
      }, [bookmarks])

      useEffect(() => {
        setBulkConfirm(false)
      }, [selected])

      useEffect(() => {
        if (!bulkConfirm) return undefined
        const timer = setTimeout(() => setBulkConfirm(false), 4000)
        return () => clearTimeout(timer)
      }, [bulkConfirm])

      const formOpen = form !== null

      // The bookmark editor is a modal: Escape closes it and focus returns to its opener.
      useEffect(() => {
        if (!formOpen) return undefined
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setForm(null)
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('keydown', onKeyDown)
          const opener = openerRef.current
          openerRef.current = null
          if (opener !== null && typeof opener.focus === 'function') opener.focus()
        }
      }, [formOpen])

      const counts = useMemo(() => {
        const byCategory = new Map()
        let uncategorized = 0
        let starred = 0
        for (const bookmark of bookmarks) {
          if (bookmark.starred === true) starred += 1
          if (bookmark.categoryId === null || bookmark.categoryId === undefined) uncategorized += 1
          else byCategory.set(bookmark.categoryId, (byCategory.get(bookmark.categoryId) ?? 0) + 1)
        }
        return { byCategory, uncategorized, starred, all: bookmarks.length }
      }, [bookmarks])

      const visible = useMemo(() => selectVisible(bookmarks, activeCategory, query), [bookmarks, activeCategory, query])

      const noticeText =
        snapshot.notice !== null && snapshot.notice !== undefined && snapshot.notice.added !== undefined
          ? fmt(t('imported'), { added: snapshot.notice.added, skipped: snapshot.notice.skipped })
          : null

      const inAppReady = inApp !== undefined && typeof inApp.available === 'function' && inApp.available()
      const targets = buildTargets(browsers, t, inAppReady)
      const defaultTarget = resolveDefaultTarget(state?.settings, targets)
      const shownError = snapshot.error !== null && snapshot.error !== undefined ? snapshot.error : inAppError
      const allSelectedStarred =
        selected.length > 0 && selected.every((id) => bookmarks.find((bookmark) => bookmark.id === id)?.starred === true)

      const enterSelection = (next) => {
        setSelecting(next)
        setSelected([])
        setBulkConfirm(false)
        setMenu(null)
      }

      const toggleSelected = (id) => setSelected((current) => toggleSelection(current, id))

      const selectAllVisible = () => setSelected(visible.map((bookmark) => bookmark.id))

      const deleteSelected = async () => {
        if (selected.length === 0) return
        if (!bulkConfirm) {
          setBulkConfirm(true)
          return
        }
        setBulkConfirm(false)
        const body = await controller.run('bookmark/removeMany', { ids: selected })
        if (body !== null) {
          setSelected([])
          setSelecting(false)
        }
      }

      /** Move the selection into one category (null = uncategorized). */
      const moveSelected = async (categoryId) => {
        if (selected.length === 0) return
        const body = await controller.run('bookmark/moveMany', { ids: selected, categoryId })
        if (body !== null) setSelected([])
      }

      /** Flip one bookmark's star. */
      const toggleStar = (bookmark) => {
        controller.run('bookmark/star', { id: bookmark.id, starred: bookmark.starred !== true })
      }

      /** Star the whole selection, or clear its stars when every selected one has it. */
      const starSelection = async () => {
        if (selected.length === 0) return
        const allStarred = selected.every((id) => bookmarks.find((bookmark) => bookmark.id === id)?.starred === true)
        await controller.run('bookmark/starMany', { ids: selected, starred: !allStarred })
      }

      /** The second half of "create a category and move into it", in one gesture. */
      const createCategoryAndMove = async () => {
        const name = newCategoryName.trim()
        if (name === '' || selected.length === 0) return
        const created = await controller.run('category/add', { name })
        if (created === null) return
        const category = (created.state?.categories ?? []).find((entry) => entry.name === name)
        if (category === undefined) return
        const moved = await controller.run('bookmark/moveMany', { ids: selected, categoryId: category.id })
        if (moved !== null) {
          setSelected([])
          setNewCategoryName('')
        }
      }

      /** Write the whole document to a file the user keeps. */
      const downloadBackup = () => {
        const dump = {
          version: state?.version ?? 1,
          exportedAt: new Date().toISOString(),
          categories: state?.categories ?? [],
          bookmarks: state?.bookmarks ?? [],
          settings: state?.settings ?? { defaultBrowserId: 'system', defaultProfile: null },
          lastImport: state?.lastImport ?? null,
        }
        const blob = new Blob([`${JSON.stringify(dump, null, 2)}\n`], { type: 'application/json' })
        const href = URL.createObjectURL(blob)
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
        const anchor = window.document.createElement('a')
        anchor.href = href
        anchor.download = `browser-bookmarks-${stamp}.json`
        window.document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        setTimeout(() => URL.revokeObjectURL(href), 1000)
      }

      const openRestorePicker = () => {
        setRestoreError(null)
        setRestoreResult(null)
        if (fileRef.current !== null) fileRef.current.click()
      }

      /** Read a picked backup and show what it would replace before anything changes. */
      const readRestoreFile = async (event) => {
        const picked = event.target.files?.[0]
        event.target.value = ''
        if (picked === undefined || picked === null) return
        setRestoreError(null)
        setRestoreResult(null)
        try {
          const parsed = JSON.parse(await picked.text())
          if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.bookmarks) || !Array.isArray(parsed.categories)) {
            setRestoreError('invalid-backup')
            return
          }
          setRestoreDraft({ document: parsed, bookmarks: parsed.bookmarks.length, categories: parsed.categories.length })
        } catch {
          setRestoreError('file-read-failed')
        }
      }

      const applyRestore = async () => {
        if (restoreDraft === null) return
        const body = await controller.run('backup/restore', { document: restoreDraft.document })
        if (body === null) return
        setRestoreDraft(null)
        setRestoreResult({
          bookmarks: body.restored?.bookmarks ?? 0,
          categories: body.restored?.categories ?? 0,
          path: typeof body.backupPath === 'string' ? body.backupPath : '',
        })
        setSelected([])
        setSelecting(false)
        setActiveCategory(ALL)
      }

      const open = useCallback(
        (url, targetValue) => {
          setMenu(null)
          setInAppError(null)
          const target = targetValue === null || targetValue === undefined ? defaultTarget : targetValue
          if (target === 'in-app') {
            if (inApp === undefined || typeof inApp.open !== 'function') {
              setInAppError('in-app-unavailable')
              return
            }
            Promise.resolve(inApp.open(url)).then((result) => {
              if (result !== undefined && result.ok === false) setInAppError(result.error)
            })
            return
          }
          if (target === 'system') {
            controller.run('open', { url, browserId: 'system' })
            return
          }
          const { browserId, profile } = splitTarget(target)
          controller.run('open', profile === null ? { url, browserId } : { url, browserId, profile })
        },
        [controller, defaultTarget, inApp],
      )

      const submitForm = useCallback(
        async (draft) => {
          const action = draft.id === null ? 'bookmark/add' : 'bookmark/update'
          const payload =
            draft.id === null
              ? { title: draft.title, url: draft.url, categoryId: draft.categoryId }
              : { id: draft.id, title: draft.title, url: draft.url, categoryId: draft.categoryId }
          const body = await controller.run(action, payload)
          if (body !== null) setForm(null)
        },
        [controller],
      )

      const openForm = useCallback((draft) => {
        const active = document.activeElement
        openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null
        setMenu(null)
        setForm(draft)
      }, [])

      /** Persist one new category order; the Host answers with the reordered document. */
      const reorderCategories = (ids) => {
        if (ids === null || ids === undefined) return
        controller.run('category/reorder', { ids })
      }

      const dropCategory = (targetId, after) => {
        const from = draggingId
        setDraggingId(null)
        setDropTarget(null)
        if (from === null || from === undefined) return
        const next = moveCategory(categoryIds, from, targetId, after)
        if (next === categoryIds) return
        reorderCategories(next)
      }

      /** Alt+Arrow moves the focused category, so the order is reachable without a mouse. */
      const moveCategoryByKeyboard = (id, delta) => {
        const index = categoryIds.indexOf(id)
        const nextIndex = index + delta
        if (index < 0 || nextIndex < 0 || nextIndex >= categoryIds.length) return
        const order = [...categoryIds]
        order.splice(index, 1)
        order.splice(nextIndex, 0, id)
        reorderCategories(order)
      }

      /** Place one bookmark beside another; the neighbour defines the slot. */
      const moveBookmarkBeside = (id, targetId, after) => {
        if (id === targetId) return
        controller.run('bookmark/reorder', { id, targetId, after: after === true })
      }

      const onCardDragStart = (id, event) => {
        setDraggingCardId(id)
        setCardDropTarget(null)
        event.dataTransfer.effectAllowed = 'move'
        try {
          event.dataTransfer.setData('text/plain', id)
        } catch {
          /* the drag still carries our state when the carrier refuses the payload */
        }
        const card = event.currentTarget.closest('.dsh-bm-card')
        if (card !== null && typeof event.dataTransfer.setDragImage === 'function') {
          const rect = card.getBoundingClientRect()
          event.dataTransfer.setDragImage(card, event.clientX - rect.left, event.clientY - rect.top)
        }
      }

      const onCardDragOver = (id, event) => {
        if (draggingCardId === null || draggingCardId === id) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        const rect = event.currentTarget.getBoundingClientRect()
        const after = event.clientX > rect.left + rect.width / 2
        if (cardDropTarget === null || cardDropTarget.id !== id || cardDropTarget.after !== after) {
          setCardDropTarget({ id, after })
        }
      }

      const onCardDragLeave = (id, event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return
        setCardDropTarget((current) => (current !== null && current.id === id ? null : current))
      }

      const onCardDrop = (id, event) => {
        event.preventDefault()
        const from = draggingCardId
        const after = cardDropTarget !== null && cardDropTarget.id === id ? cardDropTarget.after : false
        setDraggingCardId(null)
        setCardDropTarget(null)
        if (from === null || from === undefined) return
        moveBookmarkBeside(from, id, after)
      }

      const onCardDragEnd = () => {
        setDraggingCardId(null)
        setCardDropTarget(null)
      }

      /** Alt+Arrow reorders within the visible grid, so it works under any filter. */
      const moveCardByKeyboard = (id, delta) => {
        const index = visible.findIndex((bookmark) => bookmark.id === id)
        if (index < 0) return
        const neighbour = visible[index + delta]
        if (neighbour === undefined) return
        moveBookmarkBeside(id, neighbour.id, delta > 0)
      }

      const renderBrowserMenu = (url, close, position) =>
        h(
          'div',
          {
            className: 'dsh-bm-menu',
            role: 'menu',
            style: { left: `${position.left}px`, top: `${position.top}px` },
          },
          h('div', { className: 'dsh-bm-menuLabel' }, t('openWith')),
          targets.map((target) =>
            h(
              'button',
              {
                key: target.value,
                type: 'button',
                className: 'dsh-bm-menuItem',
                role: 'menuitem',
                disabled: !target.available,
                onClick: () => {
                  close()
                  open(url, target.value)
                },
              },
              target.available ? target.label : `${target.label} (${t('unavailable')})`,
            ),
          ),
        )

      if (snapshot.status === 'loading' && state === null) {
        return h('div', { className: 'dsh-bm-root' }, h('style', null, CSS), h('div', { className: 'dsh-bm-empty' }, t('loading')))
      }

      if (snapshot.status === 'error' && state === null) {
        return h(
          'div',
          { className: 'dsh-bm-root' },
          h('style', null, CSS),
          h(
            'div',
            { className: 'dsh-bm-empty' },
            h('strong', null, t('failed')),
            h('span', { className: 'dsh-bm-errorText' }, errorText(t, snapshot.error)),
            h('button', { type: 'button', className: 'dsh-bm-btn', onClick: () => controller.load() }, t('retry')),
          ),
        )
      }

      const railRow = (key, label, count) => {
        const active = activeCategory === key
        return h(
          'button',
          {
            key,
            type: 'button',
            className: active ? 'dsh-bm-railRow dsh-bm-railRowActive' : 'dsh-bm-railRow',
            'aria-current': active ? 'true' : undefined,
            onClick: () => setActiveCategory(key),
          },
          h('span', { className: 'dsh-bm-railName' }, label),
          h('span', { className: 'dsh-bm-railCount' }, count),
        )
      }

      const content = []

      if (backupOpen) {
        content.push(
          h(
            'section',
            { key: 'backup', className: 'dsh-bm-panel' },
            h(
              'div',
              { className: 'dsh-bm-panelHead' },
              h('h2', { className: 'dsh-bm-panelTitle' }, t('backupTitle')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-bm-iconBtn',
                  'aria-label': t('cancel'),
                  title: t('cancel'),
                  onClick: () => {
                    setBackupOpen(false)
                    setRestoreDraft(null)
                    setRestoreError(null)
                  },
                },
                icon(ICON_CLOSE, 14),
              ),
            ),
            h('p', { className: 'dsh-bm-panelHint' }, fmt(t('backupHint'), { bookmarks: bookmarks.length, categories: categories.length })),
            h(
              'div',
              { className: 'dsh-bm-formActions' },
              h('button', { type: 'button', className: 'dsh-bm-btn', onClick: downloadBackup }, t('backupDownload')),
              h('button', { type: 'button', className: 'dsh-bm-btn', onClick: openRestorePicker }, t('restoreChoose')),
              h('input', {
                ref: fileRef,
                type: 'file',
                accept: 'application/json,.json',
                style: { display: 'none' },
                onChange: readRestoreFile,
              }),
            ),
            restoreDraft !== null
              ? h(
                  'div',
                  { className: 'dsh-bm-restoreConfirm' },
                  h(
                    'p',
                    { className: 'dsh-bm-panelHint' },
                    fmt(t('restorePreview'), { bookmarks: restoreDraft.bookmarks, categories: restoreDraft.categories }),
                  ),
                  h(
                    'div',
                    { className: 'dsh-bm-formActions' },
                    h('button', { type: 'button', className: 'dsh-bm-btn dsh-bm-btnSecondary', onClick: () => setRestoreDraft(null) }, t('cancel')),
                    h(
                      'button',
                      { type: 'button', className: 'dsh-bm-btn dsh-bm-btnDanger', disabled: snapshot.busy, onClick: applyRestore },
                      t('restoreConfirm'),
                    ),
                  ),
                )
              : null,
            restoreError !== null ? h('p', { className: 'dsh-bm-errorText' }, errorText(t, restoreError)) : null,
            restoreResult !== null
              ? h(
                  'div',
                  { className: 'dsh-bm-restoreConfirm' },
                  h(
                    'p',
                    { className: 'dsh-bm-notice' },
                    fmt(t('restoreDone'), { bookmarks: restoreResult.bookmarks, categories: restoreResult.categories }),
                  ),
                  restoreResult.path !== '' ? h('p', { className: 'dsh-bm-path' }, fmt(t('restoreSnapshot'), { path: restoreResult.path })) : null,
                )
              : null,
          ),
        )
      }

      if (importOpen) {
        content.push(
          h(
            'section',
            { key: 'import', className: 'dsh-bm-panel' },
            h(
              'div',
              { className: 'dsh-bm-panelHead' },
              h('h2', { className: 'dsh-bm-panelTitle' }, t('importTitle')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-bm-iconBtn',
                  'aria-label': t('cancel'),
                  title: t('cancel'),
                  onClick: () => {
                    setImportOpen(false)
                    setSourceId(null)
                  },
                },
                icon(ICON_CLOSE, 14),
              ),
            ),
            h('p', { className: 'dsh-bm-panelHint' }, t('importHint')),
            snapshot.sources.length === 0
              ? h('p', { className: 'dsh-bm-panelHint' }, t('noSources'))
              : h(
                  'div',
                  { className: 'dsh-bm-sources' },
                  snapshot.sources.map((source) => {
                    const active = sourceId === source.id
                    const when = new Date(source.modifiedAt).toLocaleString()
                    return h(
                      'button',
                      {
                        key: source.id,
                        type: 'button',
                        className: active ? 'dsh-bm-source dsh-bm-sourceActive' : 'dsh-bm-source',
                        onClick: () => setSourceId(source.id),
                      },
                      h(
                        'span',
                        { className: 'dsh-bm-sourceBody' },
                        h('span', { className: 'dsh-bm-sourceName' }, `${source.browser} · ${source.profileName || source.profile}`),
                        h(
                          'span',
                          { className: 'dsh-bm-sourceMeta' },
                          [source.account, fmt(t('sourceUpdated'), { when })].filter((part) => typeof part === 'string' && part !== '').join(' · '),
                        ),
                      ),
                    )
                  }),
                ),
            h('p', { className: 'dsh-bm-panelHint' }, t('firefoxHint')),
            h(
              'div',
              { className: 'dsh-bm-formActions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-bm-btn',
                  onClick: () => {
                    setImportOpen(false)
                    setSourceId(null)
                  },
                },
                t('cancel'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-bm-btn dsh-bm-btnPrimary',
                  disabled: sourceId === null || snapshot.busy,
                  onClick: async () => {
                    const body = await controller.run('import/run', { sourceId })
                    if (body !== null) {
                      setImportOpen(false)
                      setSourceId(null)
                      setActiveCategory(ALL)
                    }
                  },
                },
                snapshot.busy ? t('importing') : t('import'),
              ),
            ),
          ),
        )
      }

      if (visible.length === 0) {
        content.push(
          h(
            'div',
            { key: 'empty', className: 'dsh-bm-empty' },
            icon(['M6.75 4.25h10.5a1.5 1.5 0 0 1 1.5 1.5v14.1a.75.75 0 0 1-1.16.63L12 16.9l-5.59 3.58a.75.75 0 0 1-1.16-.63V5.75a1.5 1.5 0 0 1 1.5-1.5Z'], 28),
            h('span', null, query.trim() !== '' ? t('emptySearch') : activeCategory === ALL ? t('empty') : t('emptyCategory')),
            bookmarks.length === 0
              ? h(
                  'span',
                  { className: 'dsh-bm-formActions' },
                  h('button', { type: 'button', className: 'dsh-bm-btn', onClick: () => setImportOpen(true) }, t('import')),
                  h(
                    'button',
                    { type: 'button', className: 'dsh-bm-btn dsh-bm-btnPrimary', onClick: () => openForm({ id: null, title: '', url: '', categoryId: null }) },
                    t('addBookmark'),
                  ),
                )
              : null,
          ),
        )
      } else {
        content.push(
          h(
            'div',
            { key: 'grid', className: 'dsh-bm-grid' },
            visible.map((bookmark) =>
              h(BookmarkCard, {
                key: bookmark.id,
                t,
                bookmark,
                busy: snapshot.busy,
                menuOpen: menu !== null && menu.id === bookmark.id,
                menuPosition: menu,
                pending: deleteId === bookmark.id,
                selecting,
                selected: selected.includes(bookmark.id),
                onToggleSelect: toggleSelected,
                onStar: toggleStar,
                drag: {
                  active: draggingCardId === bookmark.id,
                  position:
                    cardDropTarget !== null && cardDropTarget.id === bookmark.id
                      ? cardDropTarget.after
                        ? 'after'
                        : 'before'
                      : null,
                },
                onCardDragStart,
                onCardDragOver,
                onCardDragLeave,
                onCardDrop,
                onCardDragEnd,
                onMoveBy: moveCardByKeyboard,
                open,
                edit: (target) => {
                  openForm({ id: target.id, title: target.title, url: target.url, categoryId: target.categoryId ?? null })
                },
                remove: async (id) => {
                  setDeleteId(null)
                  await controller.run('bookmark/remove', { id })
                },
                onAskDelete: (id) => setDeleteId(id),
                onMenu: (id, element) => {
                  if (element === null || element === undefined || (menu !== null && menu.id === id)) {
                    setMenu(null)
                    return
                  }
                  const rect = element.getBoundingClientRect()
                  setMenu({
                    id,
                    left: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)),
                    top: Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 260)),
                  })
                },
                renderBrowserMenu,
              }),
            ),
          ),
        )
      }

      if (selecting) {
        content.push(
          h(
            'div',
            { key: 'bulk', className: 'dsh-bm-bulk', role: 'group', 'aria-label': fmt(t('selectedCount'), { n: selected.length }) },
            h(
              'div',
              { className: 'dsh-bm-bulkRow' },
              h('span', { className: 'dsh-bm-bulkCount' }, fmt(t('selectedCount'), { n: selected.length })),
              h('span', { className: 'dsh-bm-bulkGap' }),
              h(
                'button',
                { type: 'button', className: 'dsh-bm-btn dsh-bm-btnSecondary', disabled: visible.length === 0, onClick: selectAllVisible },
                t('selectAll'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-bm-btn dsh-bm-btnSecondary',
                  disabled: selected.length === 0 || snapshot.busy,
                  onClick: starSelection,
                },
                allSelectedStarred ? t('unstarSelected') : t('starSelected'),
              ),
              h(
                'button',
                { type: 'button', className: 'dsh-bm-btn dsh-bm-btnSecondary', disabled: selected.length === 0, onClick: () => setSelected([]) },
                t('clearSelection'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: bulkConfirm ? 'dsh-bm-btn dsh-bm-btnDanger' : 'dsh-bm-btn dsh-bm-btnSecondary',
                  disabled: selected.length === 0 || snapshot.busy,
                  onClick: deleteSelected,
                },
                bulkConfirm ? fmt(t('confirmDeleteSelected'), { n: selected.length }) : t('deleteSelected'),
              ),
            ),
            h(
              'div',
              { className: 'dsh-bm-bulkRow' },
              h('span', { className: 'dsh-bm-bulkLabel' }, t('moveTo')),
              h(
                'select',
                {
                  className: 'dsh-bm-select',
                  value: '',
                  'aria-label': t('moveTo'),
                  disabled: selected.length === 0 || snapshot.busy,
                  onChange: (event) => {
                    const value = event.target.value
                    if (value === '') return
                    moveSelected(value === NONE ? null : value)
                  },
                },
                h('option', { value: '' }, t('movePlaceholder')),
                h('option', { value: NONE }, t('uncategorized')),
                categories.map((category) => h('option', { key: category.id, value: category.id }, category.name)),
              ),
              h(
                'form',
                {
                  className: 'dsh-bm-bulkNew',
                  onSubmit: (event) => {
                    event.preventDefault()
                    createCategoryAndMove()
                  },
                },
                h('input', {
                  className: 'dsh-bm-input',
                  placeholder: t('categoryPlaceholder'),
                  'aria-label': t('moveToNew'),
                  value: newCategoryName,
                  onChange: (event) => setNewCategoryName(event.target.value),
                }),
                h(
                  'button',
                  { type: 'submit', className: 'dsh-bm-btn', disabled: newCategoryName.trim() === '' || selected.length === 0 || snapshot.busy },
                  t('moveToNew'),
                ),
              ),
            ),
          ),
        )
      }

      return h(
        'div',
        { className: 'dsh-bm-root' },
        h('style', null, CSS),
        h(
          'header',
          { className: 'dsh-bm-head' },
          h(
            'div',
            { className: 'dsh-bm-headMain' },
            h('h1', { className: 'dsh-bm-title' }, t('title')),
            h('p', { className: 'dsh-bm-sub' }, `${t('subtitle')} ${fmt(t('summary'), { count: bookmarks.length, categories: categories.length })}`),
          ),
          h(
            'div',
            { className: 'dsh-bm-headActions' },
            h(
              'label',
              { className: 'dsh-bm-field' },
              h('span', { className: 'dsh-bm-fieldLabel' }, t('defaultBrowser')),
              h(
                'select',
                {
                  className: 'dsh-bm-select',
                  value: defaultTarget,
                  onChange: (event) => {
                    const value = event.target.value
                    if (value === 'system') {
                      controller.run('settings/defaultBrowser', { browserId: 'system', profile: null })
                      return
                    }
                    const { browserId, profile } = splitTarget(value)
                    controller.run('settings/defaultBrowser', { browserId, profile })
                  },
                },
                targets.map((target) =>
                  h(
                    'option',
                    { key: target.value, value: target.value, disabled: !target.available },
                    target.available ? target.label : `${target.label} (${t('unavailable')})`,
                  ),
                ),
              ),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-bm-btn',
                'aria-pressed': selecting ? 'true' : 'false',
                onClick: () => enterSelection(!selecting),
              },
              selecting ? t('exitSelect') : t('selectMode'),
            ),
            h('button', { type: 'button', className: 'dsh-bm-btn', onClick: () => { setBackupOpen(false); setImportOpen(true) } }, t('import')),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-bm-btn',
                onClick: () => {
                  setImportOpen(false)
                  setForm(null)
                  setMenu(null)
                  setBackupOpen(true)
                },
              },
              t('backup'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-bm-btn dsh-bm-btnPrimary',
                onClick: () =>
                  openForm({
                    id: null,
                    title: '',
                    url: '',
                    categoryId: activeCategory === ALL || activeCategory === NONE || activeCategory === STARRED ? null : activeCategory,
                  }),
              },
              t('addBookmark'),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dsh-bm-toolbar' },
          h('input', {
            className: 'dsh-bm-input dsh-bm-search',
            placeholder: t('search'),
            'aria-label': t('search'),
            value: query,
            onChange: (event) => setQuery(event.target.value),
          }),
          noticeText !== null ? h('span', { className: 'dsh-bm-notice' }, noticeText) : null,
          shownError !== null ? h('span', { className: 'dsh-bm-errorText' }, errorText(t, shownError)) : null,
          state?.lastImport ? h('span', { className: 'dsh-bm-panelHint' }, fmt(t('lastImport'), { browser: state.lastImport.browser, profile: state.lastImport.profile })) : null,
        ),
        h(
          'div',
          { className: 'dsh-bm-body' },
          h(
            'aside',
            { className: 'dsh-bm-rail' },
            h('div', { className: 'dsh-bm-railTitle' }, t('categories')),
            categories.length > 1 ? h('div', { className: 'dsh-bm-railHint' }, t('dragHint')) : null,
            railRow(ALL, t('all'), counts.all),
            railRow(STARRED, t('starred'), counts.starred),
            railRow(NONE, t('uncategorized'), counts.uncategorized),
            categories.map((category) => {
              if (renaming !== null && renaming.id === category.id) {
                return h(
                  'form',
                  {
                    key: category.id,
                    className: 'dsh-bm-railRow',
                    onSubmit: async (event) => {
                      event.preventDefault()
                      const body = await controller.run('category/rename', { id: category.id, name: renaming.name })
                      if (body !== null) setRenaming(null)
                    },
                  },
                  h('input', {
                    className: 'dsh-bm-input',
                    style: { height: '24px', flex: 1, minWidth: 0 },
                    value: renaming.name,
                    autoFocus: true,
                    'aria-label': t('rename'),
                    onChange: (event) => setRenaming({ ...renaming, name: event.target.value }),
                    onBlur: () => setRenaming(null),
                    onKeyDown: (event) => {
                      if (event.key === 'Escape') setRenaming(null)
                    },
                  }),
                )
              }
              const active = activeCategory === category.id
              const classes = ['dsh-bm-railRow']
              if (active) classes.push('dsh-bm-railRowActive')
              if (draggingId === category.id) classes.push('dsh-bm-railRowDragging')
              if (dropTarget !== null && dropTarget.id === category.id) {
                classes.push(dropTarget.after ? 'dsh-bm-railDropAfter' : 'dsh-bm-railDropBefore')
              }
              return h(
                'div',
                {
                  key: category.id,
                  className: classes.join(' '),
                  role: 'button',
                  tabIndex: 0,
                  'aria-current': active ? 'true' : undefined,
                  title: category.name,
                  onClick: () => setActiveCategory(category.id),
                  onKeyDown: (event) => {
                    // Keys reach the row only when the row itself has focus; the rename
                    // and delete buttons inside it own their own Enter/Space.
                    if (event.target !== event.currentTarget) return
                    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                      event.preventDefault()
                      moveCategoryByKeyboard(category.id, event.key === 'ArrowUp' ? -1 : 1)
                      return
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActiveCategory(category.id)
                    }
                  },
                  onDragOver: (event) => {
                    if (draggingId === null || draggingId === category.id) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    const rect = event.currentTarget.getBoundingClientRect()
                    const after = event.clientY > rect.top + rect.height / 2
                    if (dropTarget === null || dropTarget.id !== category.id || dropTarget.after !== after) {
                      setDropTarget({ id: category.id, after })
                    }
                  },
                  onDragLeave: (event) => {
                    if (event.currentTarget.contains(event.relatedTarget)) return
                    setDropTarget((current) => (current !== null && current.id === category.id ? null : current))
                  },
                  onDrop: (event) => {
                    event.preventDefault()
                    dropCategory(category.id, dropTarget !== null && dropTarget.id === category.id ? dropTarget.after : false)
                  },
                },
                // Dragging starts on this handle only: a row that is itself draggable
                // swallows plain clicks as soon as the pointer moves a pixel.
                h(
                  'span',
                  {
                    className: 'dsh-bm-railGrip',
                    draggable: true,
                    title: t('dragHandle'),
                    'aria-hidden': 'true',
                    onClick: (event) => event.stopPropagation(),
                    onDragStart: (event) => {
                      setDraggingId(category.id)
                      setDropTarget(null)
                      event.dataTransfer.effectAllowed = 'move'
                      try {
                        event.dataTransfer.setData('text/plain', category.id)
                      } catch {
                        /* some carriers refuse the payload; the drag still carries our state */
                      }
                    },
                    onDragEnd: () => {
                      setDraggingId(null)
                      setDropTarget(null)
                    },
                  },
                  h(GripIcon),
                ),
                h('span', { className: 'dsh-bm-railName' }, category.name),
                h('span', { className: 'dsh-bm-railCount' }, counts.byCategory.get(category.id) ?? 0),
                h(
                  'span',
                  { className: 'dsh-bm-railTools', onClick: (event) => event.stopPropagation() },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-bm-iconBtn',
                      'aria-label': t('rename'),
                      title: t('rename'),
                      onClick: () => setRenaming({ id: category.id, name: category.name }),
                    },
                    icon(ICON_PEN, 13),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-bm-iconBtn dsh-bm-iconBtnDanger',
                      'aria-label': t('delete'),
                      title: t('deleteCategoryHint'),
                      onClick: async () => {
                        if (activeCategory === category.id) setActiveCategory(ALL)
                        await controller.run('category/remove', { id: category.id })
                      },
                    },
                    icon(ICON_CLOSE, 13),
                  ),
                ),
              )
            }),
            creating === null
              ? h(
                  'button',
                  { type: 'button', className: 'dsh-bm-railRow', onClick: () => setCreating('') },
                  h('span', { className: 'dsh-bm-railName', style: { color: 'var(--dsw-alias-label-tertiary)' } }, t('newCategory')),
                  icon(ICON_PLUS, 13),
                )
              : h(
                  'form',
                  {
                    className: 'dsh-bm-railRow',
                    onSubmit: async (event) => {
                      event.preventDefault()
                      const body = await controller.run('category/add', { name: creating })
                      if (body !== null) setCreating(null)
                    },
                  },
                  h('input', {
                    className: 'dsh-bm-input',
                    style: { height: '24px', flex: 1, minWidth: 0 },
                    placeholder: t('categoryPlaceholder'),
                    'aria-label': t('newCategory'),
                    value: creating,
                    autoFocus: true,
                    onChange: (event) => setCreating(event.target.value),
                    onBlur: () => setCreating(null),
                    onKeyDown: (event) => {
                      if (event.key === 'Escape') setCreating(null)
                    },
                  }),
                ),
          ),
          h('main', { className: 'dsh-bm-content' }, content),
        ),
        formOpen
          ? h(
              'div',
              {
                className: 'dsh-bm-overlay',
                onMouseDown: (event) => {
                  if (event.target === event.currentTarget) setForm(null)
                },
              },
              h(
                'div',
                {
                  className: 'dsh-bm-dialog',
                  role: 'dialog',
                  'aria-modal': 'true',
                  'aria-labelledby': 'browser-bookmarks-dialog-title',
                  onKeyDown: (event) => {
                    if (event.key !== 'Tab') return
                    const focusables = [...event.currentTarget.querySelectorAll('input, select, button')]
                    if (focusables.length === 0) return
                    const first = focusables[0]
                    const last = focusables[focusables.length - 1]
                    if (event.shiftKey && document.activeElement === first) {
                      event.preventDefault()
                      last.focus()
                    } else if (!event.shiftKey && document.activeElement === last) {
                      event.preventDefault()
                      first.focus()
                    }
                  },
                },
                h(
                  'h2',
                  { id: 'browser-bookmarks-dialog-title', className: 'dsh-bm-dialogTitle' },
                  form.id === null ? t('addTitle') : t('editTitle'),
                ),
                h(
                  'form',
                  {
                    className: 'dsh-bm-dialogBody',
                    onSubmit: (event) => {
                      event.preventDefault()
                      submitForm(form)
                    },
                  },
                  h(
                    'label',
                    { className: 'dsh-bm-dialogField' },
                    h('span', { className: 'dsh-bm-dialogLabel' }, t('titleField')),
                    h('input', {
                      className: 'dsh-bm-input',
                      placeholder: t('titlePlaceholder'),
                      value: form.title,
                      autoFocus: true,
                      onChange: (event) => setForm({ ...form, title: event.target.value }),
                    }),
                  ),
                  h(
                    'label',
                    { className: 'dsh-bm-dialogField' },
                    h('span', { className: 'dsh-bm-dialogLabel' }, t('urlField')),
                    h('input', {
                      className: 'dsh-bm-input',
                      placeholder: t('urlPlaceholder'),
                      value: form.url,
                      onChange: (event) => setForm({ ...form, url: event.target.value }),
                    }),
                  ),
                  h(
                    'label',
                    { className: 'dsh-bm-dialogField' },
                    h('span', { className: 'dsh-bm-dialogLabel' }, t('categoryField')),
                    h(
                      'select',
                      {
                        className: 'dsh-bm-select',
                        value: form.categoryId ?? '',
                        onChange: (event) => setForm({ ...form, categoryId: event.target.value === '' ? null : event.target.value }),
                      },
                      h('option', { value: '' }, t('uncategorized')),
                      categories.map((category) => h('option', { key: category.id, value: category.id }, category.name)),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'dsh-bm-dialogActions' },
                    h(
                      'button',
                      { type: 'button', className: 'dsh-bm-btn dsh-bm-btnSecondary', onClick: () => setForm(null) },
                      t('cancel'),
                    ),
                    h(
                      'button',
                      { type: 'submit', className: 'dsh-bm-btn dsh-bm-btnPrimary', disabled: snapshot.busy },
                      form.id === null ? t('create') : t('save'),
                    ),
                  ),
                ),
              ),
            )
          : null,
      )
    }

    /* ---------------------------------------------------------------- plugin */

    /** The slots, dictionary, and layout services this plugin needs. */
    const inject = ['slots', 'locale', 'layout']

    /**
     * Contribute the sidebar entry and the panel it opens.
     *
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'browser-bookmarks: dictionaries')
      const t = ctx.locale.bind(NS)
      const controller = createController()
      const inApp = createInAppBrowser(ctx)

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({ controller, t, inApp }),
          },
          Page,
        ),
      )

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 20,
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
      internals: { buildTargets, splitTarget, resolveDefaultTarget, profileLabel, createInAppBrowser, moveCategory, toggleSelection, selectVisible, defaultView },
    }
  },
})
