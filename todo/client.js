window.__ModuleLoader__.load({
  id: '@local/todo',
  factory(require) {
    const React = require('react')
    const { useEffect, useMemo, useRef, useState, useSyncExternalStore } = React
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'todo'
    /** The id shared by the sidebar entry and the main panel it opens. */
    const PANEL_ID = 'todo'
    /** The Host route base registered by index.js. */
    const API = '/todo'

    const STATUS_ORDER = ['todo', 'doing', 'done']
    const PRIORITIES = ['high', 'medium', 'low']
    const REPEATS = ['daily', 'weekdays', 'weekly', 'monthly']
    const DEFAULT_CONFIG = { reminderLeadMinutes: 0, donePreviewLimit: 50 }

    /* ------------------------------------------------------------------ copy */

    const zh = {
      panel: '待办',
      commandDescription: '打开待办看板',
      title: '待办',
      stats: '{open} 项未完成 · 今天到期 {today} 项 · 已逾期 {overdue} 项',
      statsPlain: '{open} 项未完成',
      search: '搜索标题或备注',
      searchClear: '清除搜索',
      sort: '排序',
      sortPriority: '按优先级重排',
      sortDue: '按截止日重排',
      reranked: '已按{by}重排',
      rerankPriority: '优先级',
      rerankDue: '截止日',
      add: '新建',
      capture: '写点什么，回车保存…',
      filterAll: '全部',
      filterToday: '今天',
      filterWeek: '本周',
      filterOverdue: '逾期',
      filterNoDate: '无日期',
      clearFilters: '清除筛选',
      viewBoard: '看板',
      viewArchive: '已归档',
      colTodo: '待办',
      colDoing: '进行中',
      colDone: '已完成',
      emptyTodo: '空着也挺好',
      emptyDoing: '把卡片拖到这里，表示正在做',
      emptyDone: '完成的会落在这里',
      emptyAll: '还没有待办。在上面输入第一条，回车即可保存。',
      emptyFiltered: '没有符合当前筛选的待办。',
      emptyArchive: '还没有归档的待办。',
      addToColumn: '添加到这一列',
      showMore: '显示更多（还有 {n} 项）',
      showLess: '收起',
      archiveAll: '归档全部',
      archiveAllConfirm: '归档全部已完成？',
      archiveAllBody: '{n} 项已完成的待办会移到已归档，可在归档视图恢复。',
      confirmDelete: '删除待办',
      confirmDeleteBody: '删除「{title}」后无法恢复。',
      cancel: '取消',
      confirm: '确认',
      remove: '删除',
      archiveAction: '归档',
      restore: '恢复',
      edit: '编辑',
      complete: '完成',
      uncomplete: '取消完成',
      noteField: '备注',
      titleField: '标题',
      notePlaceholder: '补充一点上下文（可选）',
      dueField: '截止日期',
      clearDue: '清除日期',
      priorityField: '优先级',
      priorityNone: '无',
      priorityLow: '低',
      priorityMedium: '中',
      priorityHigh: '高',
      tagsField: '标签',
      tagPlaceholder: '回车添加标签',
      tagRemove: '移除标签',
      repeatField: '重复',
      repeatNone: '不重复',
      repeatDaily: '每天',
      repeatWeekdays: '每个工作日',
      repeatWeekly: '每周',
      repeatMonthly: '每月',
      repeatRequiresDate: '重复任务需要先设置截止日期。',
      overdueDays: '逾期 {n} 天',
      overdueHours: '逾期 {n} 小时',
      statusField: '状态',
      dateFilters: '日期范围',
      tagFilters: '标签筛选',
      views: '视图',
      today: '今天',
      tomorrow: '明天',
      yesterday: '昨天',
      dueAt: '{date} {time}',
      todayAt: '今天 {time}',
      tomorrowAt: '明天 {time}',
      loading: '加载中…',
      loadFailed: '待办加载失败。',
      retry: '重试',
      stale: '已在别处更新，已刷新。',
      added: '已添加「{title}」',
      undo: '撤销',
      archivedCount: '已归档 {n} 项',
      repeatSpawned: '已生成下一次：{date}',
      spawnKept: '下一次已保留',
      spawnRemoved: '已撤回自动生成的下一次',
      repeatBadge: '重复任务',
      noteBadge: '有备注',
      dueToast: '「{title}」{time} 到期',
      open: '打开',
      close: '关闭',
      errTitle: '标题不能为空。',
      errRepeatDate: '重复任务需要截止日期。',
      errNotFound: '这条待办已不存在。',
      errDate: '日期无效。',
      errVersion: '数据文件版本过新，请升级插件。',
      errSave: '保存失败，请重试。',
      errState: '数据文件无法读取。',
      errStatus: '状态无效。',
      errPriority: '优先级无效。',
      errRepeat: '重复规则无效。',
      errOrder: '顺序无效。',
      errGeneric: '操作没有完成，请重试。',
    }

    const en = {
      panel: 'Tasks',
      commandDescription: 'Open the task board',
      title: 'Tasks',
      stats: '{open} open · {today} today · {overdue} overdue',
      statsPlain: '{open} open',
      search: 'Search titles or notes',
      searchClear: 'Clear search',
      sort: 'Sort',
      sortPriority: 'Reorder by priority',
      sortDue: 'Reorder by due date',
      reranked: 'Reordered by {by}',
      rerankPriority: 'priority',
      rerankDue: 'due date',
      add: 'New task',
      capture: 'Write it down, press Enter to save…',
      filterAll: 'All',
      filterToday: 'Today',
      filterWeek: 'This week',
      filterOverdue: 'Overdue',
      filterNoDate: 'No date',
      clearFilters: 'Clear filters',
      viewBoard: 'Board',
      viewArchive: 'Archived',
      colTodo: 'To do',
      colDoing: 'In progress',
      colDone: 'Done',
      emptyTodo: 'An empty tray is fine',
      emptyDoing: 'Drag a card here when you start it',
      emptyDone: 'Finished tasks land here',
      emptyAll: 'No tasks yet. Type the first one above and press Enter.',
      emptyFiltered: 'No tasks match the current filters.',
      emptyArchive: 'Nothing archived yet.',
      addToColumn: 'Add to this column',
      showMore: 'Show more ({n} left)',
      showLess: 'Show less',
      archiveAll: 'Archive all',
      archiveAllConfirm: 'Archive every completed task?',
      archiveAllBody: '{n} completed tasks move to the archive, where they can be restored.',
      confirmDelete: 'Delete task',
      confirmDeleteBody: 'Deleting “{title}” cannot be undone.',
      cancel: 'Cancel',
      confirm: 'Confirm',
      remove: 'Delete',
      archiveAction: 'Archive',
      restore: 'Restore',
      edit: 'Edit',
      complete: 'Complete',
      uncomplete: 'Mark not done',
      noteField: 'Note',
      titleField: 'Title',
      notePlaceholder: 'A little context (optional)',
      dueField: 'Due date',
      clearDue: 'Clear date',
      priorityField: 'Priority',
      priorityNone: 'None',
      priorityLow: 'Low',
      priorityMedium: 'Medium',
      priorityHigh: 'High',
      tagsField: 'Tags',
      tagPlaceholder: 'Press Enter to add a tag',
      tagRemove: 'Remove tag',
      repeatField: 'Repeat',
      repeatNone: 'Never',
      repeatDaily: 'Daily',
      repeatWeekdays: 'Every weekday',
      repeatWeekly: 'Weekly',
      repeatMonthly: 'Monthly',
      repeatRequiresDate: 'A repeating task needs a due date first.',
      overdueDays: 'Overdue {n}d',
      overdueHours: 'Overdue {n}h',
      statusField: 'Status',
      dateFilters: 'Date range',
      tagFilters: 'Filter by tag',
      views: 'View',
      today: 'Today',
      tomorrow: 'Tomorrow',
      yesterday: 'Yesterday',
      dueAt: '{date} {time}',
      todayAt: 'Today {time}',
      tomorrowAt: 'Tomorrow {time}',
      loading: 'Loading…',
      loadFailed: 'Could not load tasks.',
      retry: 'Retry',
      stale: 'Changed elsewhere; refreshed.',
      added: 'Added “{title}”',
      undo: 'Undo',
      archivedCount: 'Archived {n} tasks',
      repeatSpawned: 'Next occurrence: {date}',
      spawnKept: 'The next occurrence was kept',
      spawnRemoved: 'The generated next occurrence was removed',
      repeatBadge: 'Repeating task',
      noteBadge: 'Has a note',
      dueToast: '“{title}” is due at {time}',
      open: 'Open',
      close: 'Close',
      errTitle: 'A title is required.',
      errRepeatDate: 'A repeating task needs a due date.',
      errNotFound: 'That task no longer exists.',
      errDate: 'That date is not valid.',
      errVersion: 'This data file is from a newer plugin version.',
      errSave: 'Could not save; try again.',
      errState: 'The data file could not be read.',
      errStatus: 'That status is not valid.',
      errPriority: 'That priority is not valid.',
      errRepeat: 'That repeat rule is not valid.',
      errOrder: 'That order is not valid.',
      errGeneric: 'The action did not complete; try again.',
    }

    /* ----------------------------------------------------------------- utils */

    function fmt(text, vars) {
      if (typeof text !== 'string') return ''
      return text.replace(/\{(\w+)\}/g, (match, key) => (vars !== undefined && vars[key] !== undefined ? String(vars[key]) : match))
    }

    function pad2(value) {
      return String(value).padStart(2, '0')
    }

    function startOfDay(ts) {
      const date = new Date(ts)
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    }

    function startOfWeek(ts) {
      const day = new Date(startOfDay(ts))
      const offset = (day.getDay() + 6) % 7
      day.setDate(day.getDate() - offset)
      return day.getTime()
    }

    function isOverdue(item, now) {
      return item.status !== 'done' && item.archivedAt === null && item.dueAt !== null && item.dueAt < now
    }

    function priorityRank(priority) {
      if (priority === 'high') return 0
      if (priority === 'medium') return 1
      if (priority === 'low') return 2
      return 3
    }

    function byOrder(left, right) {
      return left.order - right.order
    }

    function formatShortDate(ts) {
      return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(ts))
    }

    function formatClock(ts) {
      const date = new Date(ts)
      return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
    }

    /** The one-line due label, with the tone that drives its colour. */
    function dueLabel(item, now, t) {
      if (item.dueAt === null) return null
      const dueDay = startOfDay(item.dueAt)
      const today = startOfDay(now)
      const diff = Math.round((dueDay - today) / 86400000)
      const time = item.dueHasTime ? formatClock(item.dueAt) : ''
      if (isOverdue(item, now)) {
        const hours = (now - item.dueAt) / 3600000
        if (hours < 24) return { text: fmt(t('overdueHours'), { n: Math.max(1, Math.ceil(hours)) }), tone: 'warn' }
        const days = Math.max(1, Math.floor(hours / 24))
        return { text: fmt(t('overdueDays'), { n: days }), tone: 'warn' }
      }
      if (diff === 0) return { text: time === '' ? t('today') : fmt(t('todayAt'), { time }), tone: 'today' }
      if (diff === 1) return { text: time === '' ? t('tomorrow') : fmt(t('tomorrowAt'), { time }), tone: 'soon' }
      if (diff === -1) return { text: t('yesterday'), tone: 'muted' }
      return { text: time === '' ? formatShortDate(item.dueAt) : fmt(t('dueAt'), { date: formatShortDate(item.dueAt), time }), tone: 'muted' }
    }

    function errorText(t, code) {
      if (typeof code !== 'string') return t('errGeneric')
      const map = {
        'invalid-title': 'errTitle',
        'repeat-requires-date': 'errRepeatDate',
        'item-not-found': 'errNotFound',
        'invalid-date': 'errDate',
        'unsupported-version': 'errVersion',
        'save-failed': 'errSave',
        'state-unreadable': 'errState',
        'invalid-status': 'errStatus',
        'invalid-priority': 'errPriority',
        'invalid-repeat': 'errRepeat',
        'invalid-order': 'errOrder',
      }
      return map[code] === undefined ? t('errGeneric') : t(map[code])
    }

    function dateInputValue(ts) {
      const date = new Date(ts)
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    }

    function timeInputValue(ts) {
      return formatClock(ts)
    }

    function matchesFilters(item, filters, now) {
      if (item.archivedAt !== null) return false
      if (filters.query !== '') {
        const needle = filters.query.toLowerCase()
        const haystack = `${item.title} ${item.note}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      if (filters.tags.length > 0) {
        const lowered = item.tags.map((tag) => tag.toLowerCase())
        if (!filters.tags.some((tag) => lowered.includes(tag.toLowerCase()))) return false
      }
      if (filters.date === 'today') return item.dueAt !== null && startOfDay(item.dueAt) === startOfDay(now)
      if (filters.date === 'week') {
        if (item.dueAt === null) return false
        const from = startOfWeek(now)
        return item.dueAt >= from && item.dueAt < from + 7 * 86400000
      }
      if (filters.date === 'overdue') return isOverdue(item, now)
      if (filters.date === 'nodate') return item.dueAt === null
      return true
    }

    /* ----------------------------------------------------------------- icons */

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

    const ICON = {
      check: ['M5.25 12.5l4.5 4.5L18.75 7.5'],
      plus: ['M12 5.5v13', 'M5.5 12h13'],
      search: ['M10.75 17.25a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z', 'M15.5 15.5L20 20'],
      close: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
      edit: ['M4.75 19.25l4.2-.9 9.6-9.6a1.6 1.6 0 0 0 0-2.26l-1.04-1.04a1.6 1.6 0 0 0-2.26 0l-9.6 9.6-.9 4.2Z', 'M13.25 6.75l4 4'],
      archive: ['M4.5 7.5h15', 'M6.5 7.5v11h11v-11', 'M9.5 7.5V5.25h5V7.5', 'M10 11.5h4'],
      restore: ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3', 'M4.5 5.5V10h4.5'],
      trash: ['M5.5 7.5h13', 'M9.5 7.5V5.75h5V7.5', 'M7.25 7.5l.7 11.2h8.1l.7-11.2'],
      repeat: ['M17 5.5l2.5 2.5L17 10.5', 'M19.5 8H8.5a4 4 0 0 0-4 4v1.5', 'M7 18.5L4.5 16 7 13.5', 'M4.5 16h11a4 4 0 0 0 4-4v-1.5'],
      calendar: ['M5.25 6.75h13.5v12.5H5.25z', 'M5.25 10.25h13.5', 'M8.75 4.75v4', 'M15.25 4.75v4'],
      note: ['M6.5 4.75h11v14.5h-11z', 'M9.25 9h5.5', 'M9.25 12.5h5.5', 'M9.25 16h3'],
      sort: ['M8 5.5v13', 'M8 18.5L5 15.5', 'M16 18.5v-13', 'M16 5.5l3 3'],
      chevron: ['M7 10l5 5 5-5'],
      board: ['M4.75 5.25h4.5v13.5h-4.5z', 'M9.75 5.25h4.5v13.5h-4.5z', 'M14.75 5.25h4.5v13.5h-4.5z'],
    }

    const COLUMN_ICON = { todo: ICON.note, doing: ICON.board, done: ICON.check }
    const COLUMN_KEY = { todo: 'colTodo', doing: 'colDoing', done: 'colDone' }
    const COLUMN_EMPTY = { todo: 'emptyTodo', doing: 'emptyDoing', done: 'emptyDone' }

    /** The sidebar glyph with the unfinished count in a badge. */
    function PanelIcon({ size = 16, active }) {
      const controller = sharedController
      const snapshot = useSyncExternalStore(controller === null ? noopSubscribe : controller.subscribe, controller === null ? emptySnapshot : controller.get)
      const now = useNow(30000)
      const state = snapshot.state
      let count = 0
      let overdue = false
      if (state !== null) {
        for (const item of state.items) {
          if (item.status === 'done' || item.archivedAt !== null) continue
          count += 1
          if (item.dueAt !== null && item.dueAt < now) overdue = true
        }
      }
      const badge = count > 0 ? (count > 99 ? '99+' : String(count)) : null
      return h(
        'span',
        { className: 'dsh-todo-glyph', style: { width: size, height: size }, 'data-active': active === true ? 'true' : undefined },
        h(
          'svg',
          {
            width: size,
            height: size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.7,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true',
            focusable: 'false',
          },
          h('path', { d: 'M4.75 5.75h14.5v12.5H4.75z' }),
          h('path', { d: 'M8 10.25l1.5 1.5 2.75-2.75' }),
          h('path', { d: 'M14 10.5h2.5' }),
          h('path', { d: 'M8 15.25h8' }),
        ),
        badge === null ? null : h('span', { className: overdue ? 'dsh-todo-badge isOverdue' : 'dsh-todo-badge', 'aria-hidden': 'true' }, badge),
      )
    }

    const noopSubscribe = () => () => {}
    const emptySnapshot = () => emptyStore
    const emptyStore = { state: null, config: DEFAULT_CONFIG, toasts: [], focusRequest: null, status: 'idle' }

    /** Shared with PanelIcon, which the sidebar renders outside the page. */
    let sharedController = null

    /* ------------------------------------------------------------- controller */

    function createController() {
      let snapshot = {
        status: 'loading',
        state: null,
        config: DEFAULT_CONFIG,
        error: null,
        busy: false,
        toasts: [],
        focusRequest: null,
      }
      const listeners = new Set()
      const remindedInFlight = new Set()
      const openedAt = Date.now()
      let started = false
      let clock = null
      let toastSeq = 0
      let panelOpen = null

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
          if (body !== null && body.config !== undefined) failure.config = body.config
          throw failure
        }
        return body
      }

      function dismissToast(id) {
        set({ toasts: snapshot.toasts.filter((entry) => entry.id !== id) })
      }

      function notify(textKey, vars, action) {
        const id = ++toastSeq
        const entry = { id, textKey, vars: vars ?? {}, action: action ?? null }
        set({ toasts: [...snapshot.toasts, entry].slice(-3) })
        setTimeout(() => dismissToast(id), 8000)
        return id
      }

      function handleNotice(notice) {
        if (notice === null || typeof notice !== 'object') return
        if (notice.kind === 'repeatSpawned') {
          notify('repeatSpawned', { date: formatShortDate(notice.dueAt) }, {
            labelKey: 'undo',
            run: () => {
              if (typeof notice.sourceId === 'string') void run('item/uncomplete', { id: notice.sourceId })
            },
          })
        } else if (notice.kind === 'spawnKept') {
          notify('spawnKept')
        } else if (notice.kind === 'spawnRemoved') {
          notify('spawnRemoved')
        }
      }

      async function load() {
        set({ status: snapshot.state === null ? 'loading' : 'ready', error: null })
        try {
          const body = await call('/state')
          set({ status: 'ready', state: body.state ?? null, config: { ...DEFAULT_CONFIG, ...(body.config ?? {}) }, error: null })
          tick()
        } catch (failure) {
          set({ status: 'error', error: failure.code ?? 'failed' })
        }
      }

      async function runNow(action, payload) {
        if (snapshot.state === null) return null
        set({ busy: true, error: null })
        try {
          const body = await call('/action', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action, payload: payload ?? {}, expectedRevision: snapshot.state.revision }),
          })
          set({
            busy: false,
            state: body.state ?? snapshot.state,
            config: body.config !== undefined ? { ...DEFAULT_CONFIG, ...body.config } : snapshot.config,
          })
          handleNotice(body.notice)
          tick()
          return body
        } catch (failure) {
          if (failure.code === 'stale-revision' && failure.state !== undefined) {
            set({
              busy: false,
              state: failure.state,
              config: failure.config !== undefined ? { ...DEFAULT_CONFIG, ...failure.config } : snapshot.config,
              error: null,
            })
            notify('stale')
            return null
          }
          set({ busy: false, error: failure.code ?? 'failed', state: failure.state ?? snapshot.state })
          return null
        }
      }

      // Mutations run one at a time: a blur commit followed by a button action
      // must not race the revision check, and each request reads the latest one.
      let chain = Promise.resolve()
      function run(action, payload) {
        const task = chain.then(() => runNow(action, payload))
        chain = task.then(
          () => undefined,
          () => undefined,
        )
        return task
      }

      function requestFocus(id) {
        set({ focusRequest: { id: id ?? null, at: Date.now() } })
      }

      function openItem(id) {
        requestFocus(id)
        if (panelOpen !== null) panelOpen()
      }

      function requestOpen() {
        requestFocus(null)
        if (panelOpen !== null) panelOpen()
      }

      function consumeFocus() {
        set({ focusRequest: null })
      }

      function tick() {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
        const state = snapshot.state
        if (state === null) return
        const now = Date.now()
        const lead = (snapshot.config.reminderLeadMinutes ?? 0) * 60000
        for (const item of state.items) {
          if (item.status === 'done' || item.archivedAt !== null) continue
          if (item.dueAt === null || item.dueHasTime !== true || item.remindedAt !== null) continue
          if (item.dueAt - lead > now) continue
          if (item.dueAt < openedAt) continue
          if (remindedInFlight.has(item.id)) continue
          remindedInFlight.add(item.id)
          const title = item.title
          const time = formatClock(item.dueAt)
          void run('item/reminded', { id: item.id })
            .then((body) => {
              if (body === null) return
              notify('dueToast', { title, time }, { labelKey: 'open', run: () => openItem(item.id) })
            })
            .finally(() => remindedInFlight.delete(item.id))
        }
      }

      function startClock() {
        if (clock !== null) return
        clock = setInterval(tick, 30000)
        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', onVisibility)
        }
      }

      function onVisibility() {
        if (document.visibilityState === 'visible') tick()
      }

      function dispose() {
        if (clock !== null) clearInterval(clock)
        clock = null
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
        listeners.clear()
      }

      return {
        subscribe(listener) {
          listeners.add(listener)
          if (!started) {
            started = true
            void load()
            startClock()
          }
          return () => {
            listeners.delete(listener)
          }
        },
        get() {
          return snapshot
        },
        load,
        run,
        notify,
        dismissToast,
        requestFocus,
        requestOpen,
        consumeFocus,
        openItem,
        dispose,
        bindPanelOpen(fn) {
          panelOpen = fn
        },
      }
    }

    /* ------------------------------------------------------------------ cards */

    function CardEditor({ item, t, commit, archive, remove, existingTags, setStatus, close }) {
      const [title, setTitle] = useState(item.title)
      const [note, setNote] = useState(item.note)
      const [tagDraft, setTagDraft] = useState('')
      const [titleInvalid, setTitleInvalid] = useState(false)
      const titleRef = useRef(null)

      useEffect(() => {
        setTitle(item.title)
        setNote(item.note)
      }, [item.id])

      const dueValue = item.dueAt === null ? '' : dateInputValue(item.dueAt)
      const timeValue = item.dueAt !== null && item.dueHasTime ? timeInputValue(item.dueAt) : ''

      function commitTitle() {
        const next = title.trim()
        if (next === '') {
          setTitleInvalid(true)
          setTitle(item.title)
          return
        }
        setTitleInvalid(false)
        if (next !== item.title) commit({ title: next })
      }

      function commitNote() {
        if (note !== item.note) commit({ note })
      }

      function changeDate(value) {
        if (value === '') {
          commit({ dueAt: null, dueHasTime: false, repeat: null })
          return
        }
        const parts = value.split('-').map(Number)
        if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return
        const base = new Date(parts[0], parts[1] - 1, parts[2], item.dueHasTime ? new Date(item.dueAt).getHours() : 12, item.dueHasTime ? new Date(item.dueAt).getMinutes() : 0)
        commit({ dueAt: base.getTime(), dueHasTime: item.dueHasTime })
      }

      function changeTime(value) {
        if (value === '') {
          // Keep the date, drop the time: normalized to the end of that day.
          commit({ dueHasTime: false, dueAt: item.dueAt })
          return
        }
        const parts = value.split(':').map(Number)
        if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) return
        const base = item.dueAt === null ? new Date() : new Date(item.dueAt)
        const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), parts[0], parts[1], 0, 0)
        commit({ dueAt: next.getTime(), dueHasTime: true })
      }

      function addTag() {
        const tag = tagDraft.trim().slice(0, 24)
        if (tag === '' || item.tags.length >= 6) return
        if (item.tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
          setTagDraft('')
          return
        }
        commit({ tags: [...item.tags, tag] })
        setTagDraft('')
      }

      const suggestions = existingTags.filter((tag) => !item.tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())).slice(0, 6)

      return h(
        'div',
        {
          className: 'dsh-todo-editor',
          onKeyDown: (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur()
              close()
            }
          },
        },
        h('input', {
          ref: titleRef,
          autoFocus: true,
          className: 'dsh-todo-input dsh-todo-editorTitle',
          value: title,
          'aria-label': t('titleField'),
          'aria-invalid': titleInvalid ? 'true' : undefined,
          onChange: (event) => {
            setTitleInvalid(false)
            setTitle(event.target.value)
          },
          onBlur: commitTitle,
          onKeyDown: (event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitTitle()
              event.currentTarget.blur()
            }
          },
        }),
        titleInvalid ? h('p', { className: 'dsh-todo-errorText' }, t('errTitle')) : null,
        h('textarea', {
          className: 'dsh-todo-input dsh-todo-editorNote',
          rows: 3,
          value: note,
          placeholder: t('notePlaceholder'),
          'aria-label': t('noteField'),
          onChange: (event) => setNote(event.target.value),
          onBlur: commitNote,
        }),
        h(
          'div',
          { className: 'dsh-todo-editorRow' },
          h('span', { className: 'dsh-todo-editorLabel' }, t('dueField')),
          h('input', { type: 'date', className: 'dsh-todo-input dsh-todo-date', value: dueValue, onChange: (event) => changeDate(event.target.value) }),
          h('input', { type: 'time', className: 'dsh-todo-input dsh-todo-time', value: timeValue, onChange: (event) => changeTime(event.target.value) }),
          item.dueAt !== null
            ? h('button', { type: 'button', className: 'dsh-todo-linkBtn', onClick: () => commit({ dueAt: null, dueHasTime: false, repeat: null }) }, t('clearDue'))
            : null,
        ),
        h(
          'div',
          { className: 'dsh-todo-editorRow' },
          h('span', { className: 'dsh-todo-editorLabel' }, t('priorityField')),
          h(
            'div',
            { className: 'dsh-todo-seg' },
            [null, 'low', 'medium', 'high'].map((priority) =>
              h(
                'button',
                {
                  key: priority ?? 'none',
                  type: 'button',
                  className: 'dsh-todo-segBtn',
                  'aria-pressed': item.priority === priority ? 'true' : 'false',
                  onClick: () => commit({ priority }),
                },
                priority === null ? t('priorityNone') : priority === 'low' ? t('priorityLow') : priority === 'medium' ? t('priorityMedium') : t('priorityHigh'),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dsh-todo-editorRow' },
          h('span', { className: 'dsh-todo-editorLabel' }, t('statusField')),
          h(
            'div',
            { className: 'dsh-todo-seg' },
            STATUS_ORDER.map((status) =>
              h(
                'button',
                {
                  key: status,
                  type: 'button',
                  className: 'dsh-todo-segBtn',
                  'aria-pressed': item.status === status ? 'true' : 'false',
                  onClick: () => setStatus(status),
                },
                t(COLUMN_KEY[status]),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dsh-todo-editorRow' },
          h('span', { className: 'dsh-todo-editorLabel' }, t('repeatField')),
          h(
            'select',
            {
              className: 'dsh-todo-input dsh-todo-select',
              value: item.repeat ?? '',
              disabled: item.dueAt === null,
              title: item.dueAt === null ? t('repeatRequiresDate') : undefined,
              onChange: (event) => commit({ repeat: event.target.value === '' ? null : event.target.value }),
            },
            [['', 'repeatNone'], ['daily', 'repeatDaily'], ['weekdays', 'repeatWeekdays'], ['weekly', 'repeatWeekly'], ['monthly', 'repeatMonthly']].map(([value, key]) =>
              h('option', { key: value === '' ? 'none' : value, value }, t(key)),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dsh-todo-editorBlock' },
          h('span', { className: 'dsh-todo-editorLabel' }, t('tagsField')),
          h(
            'div',
            { className: 'dsh-todo-tagList' },
            item.tags.map((tag) =>
              h(
                'span',
                { key: tag, className: 'dsh-todo-tag' },
                `#${tag}`,
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-todo-tagRemove',
                    'aria-label': `${t('tagRemove')}: ${tag}`,
                    onClick: () => commit({ tags: item.tags.filter((existing) => existing !== tag) }),
                  },
                  icon(ICON.close, 10),
                ),
              ),
            ),
            h('input', {
              className: 'dsh-todo-input dsh-todo-tagInput',
              value: tagDraft,
              placeholder: t('tagPlaceholder'),
              'aria-label': t('tagsField'),
              disabled: item.tags.length >= 6,
              onChange: (event) => setTagDraft(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addTag()
                }
                if (event.key === 'Backspace' && tagDraft === '' && item.tags.length > 0) {
                  commit({ tags: item.tags.slice(0, -1) })
                }
              },
              onBlur: addTag,
            }),
          ),
          suggestions.length > 0
            ? h(
                'div',
                { className: 'dsh-todo-suggestions' },
                suggestions.map((tag) =>
                  h('button', { key: tag, type: 'button', className: 'dsh-todo-suggestion', onClick: () => commit({ tags: [...item.tags, tag] }) }, `#${tag}`),
                ),
              )
            : null,
        ),
        h(
          'div',
          { className: 'dsh-todo-editorActions' },
          item.status === 'done'
            ? h(
                'button',
                { type: 'button', className: 'dsh-todo-btn dsh-todo-btnGhost', onClick: () => archive(item) },
                t('archiveAction'),
              )
            : null,
          h(
            'button',
            { type: 'button', className: 'dsh-todo-btn dsh-todo-btnDanger', onClick: () => remove(item) },
            t('remove'),
          ),
        ),
      )
    }

    function Card({ item, t, now, editing, highlight, existingTags, commit, toggle, beginEdit, endEdit, setStatus, archive, remove, moveItem, drag, onDragStart, onDragOver, onDrop, onDragEnd }) {
      const due = dueLabel(item, now, t)
      const done = item.status === 'done'
      const priorityLabel = item.priority === null ? null : item.priority === 'high' ? t('priorityHigh') : item.priority === 'medium' ? t('priorityMedium') : t('priorityLow')
      const classes = ['dsh-todo-card']
      if (done) classes.push('isDone')
      if (editing) classes.push('isEditing')
      if (highlight) classes.push('isHighlighted')
      if (drag !== null && drag.id === item.id) classes.push('isDragging')
      if (drag !== null && drag.over !== null && drag.over.id === item.id) classes.push(drag.over.after ? 'isDropAfter' : 'isDropBefore')

      return h(
        'div',
        {
          className: classes.join(' '),
          role: 'listitem',
          tabIndex: 0,
          'data-todo-id': item.id,
          draggable: editing ? 'false' : 'true',
          'aria-label': `${item.title}${due === null ? '' : `, ${due.text}`}`,
          onClick: (event) => {
            if (event.target.closest('button,input,textarea,select') !== null) return
            if (!editing) beginEdit(item.id, event.currentTarget)
          },
          onKeyDown: (event) => {
            if (event.target !== event.currentTarget) return
            if (event.key === 'Enter') {
              event.preventDefault()
              beginEdit(item.id, event.currentTarget)
            } else if (event.key === 'x' || event.key === 'X') {
              event.preventDefault()
              toggle(item)
            } else if (event.altKey && event.key === 'ArrowUp') {
              event.preventDefault()
              moveItem(item, 'up')
            } else if (event.altKey && event.key === 'ArrowDown') {
              event.preventDefault()
              moveItem(item, 'down')
            } else if (event.altKey && event.key === 'ArrowLeft') {
              event.preventDefault()
              moveItem(item, 'left')
            } else if (event.altKey && event.key === 'ArrowRight') {
              event.preventDefault()
              moveItem(item, 'right')
            } else if (event.key === 'Delete') {
              event.preventDefault()
              remove(item)
            }
          },
          onDragStart: (event) => {
            if (editing) {
              event.preventDefault()
              return
            }
            event.dataTransfer.setData('text/plain', item.id)
            event.dataTransfer.effectAllowed = 'move'
            onDragStart(item.id)
          },
          onDragOver: (event) => {
            if (drag === null || drag.id === item.id) return
            event.preventDefault()
            event.stopPropagation()
            const rect = event.currentTarget.getBoundingClientRect()
            onDragOver(item, event.clientY > rect.top + rect.height / 2)
          },
          onDrop: (event) => {
            event.preventDefault()
            event.stopPropagation()
            onDrop()
          },
          onDragEnd,
        },
        h('span', { className: `dsh-todo-priorityBar${item.priority === null ? '' : ` is-${item.priority}`}`, 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'dsh-todo-cardHead' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-todo-check',
              'aria-pressed': done ? 'true' : 'false',
              'aria-label': done ? t('uncomplete') : t('complete'),
              title: done ? t('uncomplete') : t('complete'),
              onClick: (event) => {
                event.stopPropagation()
                toggle(item)
              },
            },
            h('span', { className: 'dsh-todo-checkBox' }, done ? icon(ICON.check, 12) : null),
          ),
          h(
            'div',
            { className: 'dsh-todo-cardBody' },
            h('div', { className: 'dsh-todo-cardTitle' }, item.title),
            h(
              'div',
              { className: 'dsh-todo-meta' },
              due === null ? null : h('span', { className: `dsh-todo-metaItem is-${due.tone}` }, due.text),
              priorityLabel === null ? null : h('span', { className: 'dsh-todo-metaItem' }, priorityLabel),
              item.repeat === null ? null : h('span', { className: 'dsh-todo-metaIcon', title: t('repeatBadge'), 'aria-label': t('repeatBadge') }, icon(ICON.repeat, 12)),
              item.note.trim() === '' ? null : h('span', { className: 'dsh-todo-metaIcon', title: t('noteBadge'), 'aria-label': t('noteBadge') }, icon(ICON.note, 12)),
              item.tags.slice(0, 3).map((tag) => h('span', { key: tag, className: 'dsh-todo-metaTag' }, `#${tag}`)),
              item.tags.length > 3 ? h('span', { className: 'dsh-todo-metaTag' }, `+${item.tags.length - 3}`) : null,
            ),
          ),
          h(
            'div',
            { className: 'dsh-todo-cardActions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-todo-iconBtn',
                'aria-label': t('edit'),
                title: t('edit'),
                onClick: (event) => {
                  event.stopPropagation()
                  beginEdit(item.id, null)
                },
              },
              icon(ICON.edit, 13),
            ),
            done
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-todo-iconBtn',
                    'aria-label': t('archiveAction'),
                    title: t('archiveAction'),
                    onClick: (event) => {
                      event.stopPropagation()
                      archive(item)
                    },
                  },
                  icon(ICON.archive, 13),
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-todo-iconBtn isDanger',
                'aria-label': t('remove'),
                title: t('remove'),
                onClick: (event) => {
                  event.stopPropagation()
                  remove(item)
                },
              },
              icon(ICON.trash, 13),
            ),
          ),
        ),
        editing
          ? h(CardEditor, {
              item,
              t,
              existingTags,
              commit: (patch) => commit(item.id, patch),
              archive,
              remove,
              setStatus: (status) => setStatus(item, status),
              close: endEdit,
            })
          : null,
      )
    }

    /* ------------------------------------------------------------------ page */

    function useNow(intervalMs) {
      const [now, setNow] = useState(() => Date.now())
      useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs)
        return () => clearInterval(timer)
      }, [intervalMs])
      return now
    }

    function Page(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const controller = props.controller
      const snapshot = useSyncExternalStore(controller.subscribe, controller.get)
      const state = snapshot.state
      const items = state?.items ?? []
      const now = useNow(30000)

      const [query, setQuery] = useState('')
      const [dateFilter, setDateFilter] = useState('all')
      const [tagFilter, setTagFilter] = useState([])
      const [view, setView] = useState('board')
      const [capture, setCapture] = useState('')
      const [captureStatus, setCaptureStatus] = useState('todo')
      const [editingId, setEditingId] = useState(null)
      const [confirm, setConfirm] = useState(null)
      const [showAllDone, setShowAllDone] = useState(false)
      const [sortOpen, setSortOpen] = useState(false)
      const [drag, setDrag] = useState(null)
      const [highlight, setHighlight] = useState(null)
      const [inlineError, setInlineError] = useState(null)

      const captureRef = useRef(null)
      const searchRef = useRef(null)
      const editorOpener = useRef(null)
      const sortRef = useRef(null)
      const confirmOpener = useRef(null)
      const emptyFocusOnce = useRef(false)

      // The empty board invites the first capture instead of leaving a dead page.
      useEffect(() => {
        if (emptyFocusOnce.current) return
        if (state === null) return
        if (items.some((item) => item.archivedAt === null)) return
        emptyFocusOnce.current = true
        if (captureRef.current !== null) captureRef.current.focus()
      }, [state, items])

      // A focus request arrives from the sidebar command or a reminder toast.
      useEffect(() => {
        const request = snapshot.focusRequest
        if (request === null) return
        controller.consumeFocus()
        if (request.id !== null) {
          setHighlight(request.id)
          setView('board')
          const target = document.querySelector(`[data-todo-id="${request.id}"]`)
          if (target !== null) target.scrollIntoView({ block: 'center', behavior: 'smooth' })
          setTimeout(() => setHighlight(null), 2400)
        } else if (captureRef.current !== null) {
          captureRef.current.focus()
        }
      }, [snapshot.focusRequest, controller])

      useEffect(() => {
        if (snapshot.error === null) return
        setInlineError(snapshot.error)
        const timer = setTimeout(() => setInlineError(null), 5000)
        return () => clearTimeout(timer)
      }, [snapshot.error])

      useEffect(() => {
        function onKeyDown(event) {
          const target = event.target
          const typing = target instanceof Element && target.closest('input,textarea,select,[contenteditable="true"]') !== null
          if (event.key === 'Escape') {
            if (confirm !== null) {
              closeConfirm()
              return
            }
            if (editingId !== null) {
              // Blur first so the in-place editor saves what was typed.
              if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur()
              setEditingId(null)
              if (editorOpener.current !== null) editorOpener.current.focus()
              editorOpener.current = null
              return
            }
            if (sortOpen) {
              setSortOpen(false)
              return
            }
            if (typing) {
              if (target === searchRef.current) {
                setQuery('')
                return
              }
              if (target === captureRef.current) {
                setCapture('')
                target.blur()
                return
              }
              return
            }
            if (query !== '') {
              setQuery('')
              return
            }
            if (dateFilter !== 'all' || tagFilter.length > 0) {
              clearFilters()
            }
            return
          }
          if (typing) return
          if (confirm !== null) return
          if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault()
            if (searchRef.current !== null) searchRef.current.focus()
          } else if ((event.key === 'c' || event.key === 'C') && !event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault()
            if (captureRef.current !== null) captureRef.current.focus()
          }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [confirm, editingId, sortOpen, query, dateFilter, tagFilter])

      useEffect(() => {
        if (!sortOpen) return undefined
        function onPointerDown(event) {
          if (sortRef.current !== null && sortRef.current.contains(event.target)) return
          setSortOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown, true)
        return () => document.removeEventListener('mousedown', onPointerDown, true)
      }, [sortOpen])

      const tagCounts = useMemo(() => {
        const counts = new Map()
        for (const item of items) {
          if (item.archivedAt !== null) continue
          for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
        }
        return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      }, [items])

      const existingTags = useMemo(() => tagCounts.map(([tag]) => tag), [tagCounts])

      const filtered = useMemo(
        () => items.filter((item) => matchesFilters(item, { query: query.trim(), date: dateFilter, tags: tagFilter }, now)),
        [items, query, dateFilter, tagFilter, now],
      )

      const columns = useMemo(() => {
        const result = { todo: [], doing: [], done: [] }
        for (const item of filtered) {
          if (item.status === 'done') result.done.push(item)
          else result[item.status].push(item)
        }
        result.todo.sort(byOrder)
        result.doing.sort(byOrder)
        result.done.sort((left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0))
        return result
      }, [filtered])

      const stats = useMemo(() => {
        let open = 0
        let today = 0
        let overdue = 0
        for (const item of items) {
          if (item.archivedAt !== null) continue
          if (item.status === 'done') continue
          open += 1
          if (item.dueAt !== null && startOfDay(item.dueAt) === startOfDay(now)) today += 1
          if (isOverdue(item, now)) overdue += 1
        }
        return { open, today, overdue }
      }, [items, now])

      const archived = useMemo(
        () => items.filter((item) => item.archivedAt !== null).sort((left, right) => (right.archivedAt ?? 0) - (left.archivedAt ?? 0)),
        [items],
      )

      const doneLimit = snapshot.config.donePreviewLimit ?? DEFAULT_CONFIG.donePreviewLimit
      const doneVisible = showAllDone ? columns.done : columns.done.slice(0, doneLimit)
      const doneHidden = Math.max(0, columns.done.length - doneVisible.length)
      const totalDone = items.filter((item) => item.status === 'done' && item.archivedAt === null).length

      function clearFilters() {
        setDateFilter('all')
        setTagFilter([])
        setQuery('')
      }

      async function addItem() {
        const title = capture.trim()
        if (title === '') return
        const status = captureStatus === 'doing' ? 'doing' : 'todo'
        const body = await controller.run('item/add', { title, status })
        if (body !== null && typeof body.itemId === 'string') {
          setCapture('')
          setCaptureStatus('todo')
          controller.notify('added', { title }, {
            labelKey: 'undo',
            run: () => {
              void controller.run('item/remove', { id: body.itemId })
            },
          })
        }
        if (captureRef.current !== null) captureRef.current.focus()
      }

      function toggle(item) {
        void controller.run(item.status === 'done' ? 'item/uncomplete' : 'item/complete', { id: item.id })
      }

      function beginEdit(id, element) {
        editorOpener.current = element
        setEditingId(id)
      }

      function endEdit() {
        setEditingId(null)
        if (editorOpener.current !== null) editorOpener.current.focus()
        editorOpener.current = null
      }

      function closeConfirm() {
        setConfirm(null)
        const opener = confirmOpener.current
        confirmOpener.current = null
        if (opener !== null && typeof opener.focus === 'function') opener.focus()
      }

      function commit(id, patch) {
        void controller.run('item/update', { id, ...patch })
      }

      function archive(item) {
        void controller.run('item/archive', { id: item.id })
      }

      function askDelete(item) {
        confirmOpener.current = typeof document !== 'undefined' ? document.activeElement : null
        setConfirm({
          title: t('confirmDelete'),
          body: fmt(t('confirmDeleteBody'), { title: item.title }),
          confirmLabel: t('remove'),
          run: () => void controller.run('item/remove', { id: item.id }),
        })
      }

      function askArchiveAll() {
        confirmOpener.current = typeof document !== 'undefined' ? document.activeElement : null
        setConfirm({
          title: t('archiveAllConfirm'),
          body: fmt(t('archiveAllBody'), { n: totalDone }),
          confirmLabel: t('archiveAll'),
          run: async () => {
            const body = await controller.run('items/archiveDone')
            if (body !== null) controller.notify('archivedCount', { n: body.archived ?? totalDone })
          },
        })
      }

      async function rerank(by) {
        setSortOpen(false)
        const body = await controller.run('items/rerank', { by })
        if (body !== null) controller.notify('reranked', { by: by === 'priority' ? t('rerankPriority') : t('rerankDue') })
      }

      function moveItem(item, direction) {
        if (direction === 'left' || direction === 'right') {
          const index = STATUS_ORDER.indexOf(item.status)
          const nextIndex = direction === 'right' ? Math.min(STATUS_ORDER.length - 1, index + 1) : Math.max(0, index - 1)
          if (nextIndex !== index) void controller.run('item/reorder', { id: item.id, toStatus: STATUS_ORDER[nextIndex] })
          return
        }
        const column = columns[item.status]
        const at = column.findIndex((candidate) => candidate.id === item.id)
        if (at < 0) return
        if (direction === 'up' && at > 0) void controller.run('item/reorder', { id: item.id, beforeId: column[at - 1].id })
        if (direction === 'down' && at >= 0 && at < column.length - 1) void controller.run('item/reorder', { id: item.id, afterId: column[at + 1].id })
      }

      function startDrag(id) {
        setDrag({ id, over: null })
      }

      function overCard(item, after) {
        setDrag((current) => (current === null ? current : { ...current, over: { id: item.id, column: item.status, after } }))
      }

      function overColumn(status, lastId) {
        setDrag((current) => {
          if (current === null) return current
          if (lastId !== null) return { ...current, over: { id: lastId, column: status, after: true } }
          return { ...current, over: { id: null, column: status, after: false } }
        })
      }

      function finishDrag() {
        const current = drag
        setDrag(null)
        if (current === null || current.over === null) return
        const payload = { id: current.id, toStatus: current.over.column }
        if (current.over.id !== null) {
          if (current.over.after) payload.afterId = current.over.id
          else payload.beforeId = current.over.id
        }
        void controller.run('item/reorder', payload)
      }

      function cancelDrag() {
        setDrag(null)
      }

      if (snapshot.status === 'loading' && state === null) {
        return h(
          'div',
          { className: 'dsh-todo-root' },
          h(
            'div',
            { className: 'dsh-todo-scroll dsh-todo-loading' },
            h('div', { className: 'dsh-todo-skeletonTitle' }),
            h('div', { className: 'dsh-todo-skeletonCapture' }),
            h(
              'div',
              { className: 'dsh-todo-board' },
              [0, 1, 2].map((index) =>
                h(
                  'div',
                  { key: index, className: 'dsh-todo-col' },
                  h('div', { className: 'dsh-todo-skeletonHead' }),
                  [0, 1].map((row) => h('div', { key: row, className: 'dsh-todo-skeletonCard' })),
                ),
              ),
            ),
          ),
        )
      }

      if (snapshot.status === 'error' && state === null) {
        return h(
          'div',
          { className: 'dsh-todo-root' },
          h(
            'div',
            { className: 'dsh-todo-empty dsh-todo-failed' },
            h('strong', null, t('loadFailed')),
            h('p', { className: 'dsh-todo-errorText' }, errorText(t, snapshot.error)),
            h('button', { type: 'button', className: 'dsh-todo-btn', onClick: () => void controller.load() }, t('retry')),
          ),
        )
      }

      const dateChips = [
        ['all', 'filterAll'],
        ['today', 'filterToday'],
        ['week', 'filterWeek'],
        ['overdue', 'filterOverdue'],
        ['nodate', 'filterNoDate'],
      ]

      const statsText = stats.overdue > 0 ? fmt(t('stats'), stats) : fmt(t('statsPlain'), stats)
      const emptyBoard = items.filter((item) => item.archivedAt === null).length === 0
      const filteredEmpty = filtered.length === 0 && !emptyBoard

      const columnBody = (status) => {
        const columnItems = status === 'done' ? doneVisible : columns[status]
        const lastId = columnItems.length === 0 ? null : columnItems[columnItems.length - 1].id
        return h(
          'div',
          {
            className: 'dsh-todo-colBody',
            role: 'list',
            onDragOver: (event) => {
              if (drag === null) return
              event.preventDefault()
              overColumn(status, lastId)
            },
            onDrop: (event) => {
              event.preventDefault()
              finishDrag()
            },
          },
          columnItems.map((item) =>
            h(Card, {
              key: item.id,
              item,
              t,
              now,
              editing: editingId === item.id,
              highlight: highlight === item.id,
              existingTags,
              commit,
              toggle,
              beginEdit,
              endEdit,
              setStatus: (target, status) => void controller.run('item/status', { id: target.id, status }),
              archive,
              remove: askDelete,
              moveItem,
              drag,
              onDragStart: startDrag,
              onDragOver: overCard,
              onDrop: finishDrag,
              onDragEnd: cancelDrag,
            }),
          ),
          columnItems.length === 0
            ? h('div', { className: 'dsh-todo-colEmpty' }, drag !== null ? t(COLUMN_EMPTY[status]) : t(COLUMN_EMPTY[status]))
            : null,
          status === 'done'
            ? h(
                'div',
                { className: 'dsh-todo-doneFoot' },
                doneHidden > 0 ? h('button', { type: 'button', className: 'dsh-todo-linkBtn', onClick: () => setShowAllDone(true) }, fmt(t('showMore'), { n: doneHidden })) : null,
                showAllDone && columns.done.length > doneLimit ? h('button', { type: 'button', className: 'dsh-todo-linkBtn', onClick: () => setShowAllDone(false) }, t('showLess')) : null,
                totalDone > 0 ? h('button', { type: 'button', className: 'dsh-todo-linkBtn isMuted', onClick: askArchiveAll }, t('archiveAll')) : null,
              )
            : null,
        )
      }

      return h(
        'div',
        { className: 'dsh-todo-root' },
        h(
          'div',
          { className: 'dsh-todo-scroll' },
          h(
            'header',
            { className: 'dsh-todo-head' },
            h(
              'div',
              { className: 'dsh-todo-headMain' },
              h('h1', { className: 'dsh-todo-title' }, t('title')),
              h('p', { className: 'dsh-todo-sub', 'aria-live': 'polite' }, statsText),
            ),
            h(
              'div',
              { className: 'dsh-todo-headActions' },
              h(
                'label',
                { className: 'dsh-todo-search' },
                icon(ICON.search, 14),
                h('input', {
                  ref: searchRef,
                  className: 'dsh-todo-searchInput',
                  value: query,
                  placeholder: t('search'),
                  'aria-label': t('search'),
                  onChange: (event) => setQuery(event.target.value),
                }),
                query === ''
                  ? null
                  : h(
                      'button',
                      { type: 'button', className: 'dsh-todo-iconBtn', 'aria-label': t('searchClear'), title: t('searchClear'), onClick: () => setQuery('') },
                      icon(ICON.close, 12),
                    ),
              ),
              h(
                'div',
                { className: 'dsh-todo-menuWrap', ref: sortRef },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-todo-btn',
                    'aria-haspopup': 'menu',
                    'aria-expanded': sortOpen ? 'true' : 'false',
                    onClick: () => setSortOpen((open) => !open),
                  },
                  icon(ICON.sort, 13),
                  h('span', null, t('sort')),
                ),
                sortOpen
                  ? h(
                      'div',
                      { className: 'dsh-todo-menu', role: 'menu' },
                      h('button', { type: 'button', className: 'dsh-todo-menuItem', role: 'menuitem', onClick: () => void rerank('priority') }, t('sortPriority')),
                      h('button', { type: 'button', className: 'dsh-todo-menuItem', role: 'menuitem', onClick: () => void rerank('due') }, t('sortDue')),
                    )
                  : null,
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-todo-btn dsh-todo-btnPrimary',
                  onClick: () => {
                    setView('board')
                    setCaptureStatus('todo')
                    if (captureRef.current !== null) captureRef.current.focus()
                  },
                },
                icon(ICON.plus, 13),
                h('span', null, t('add')),
              ),
            ),
          ),
          h(
            'div',
            { className: 'dsh-todo-captureRow' },
            h('input', {
              ref: captureRef,
              className: 'dsh-todo-capture',
              value: capture,
              placeholder: t('capture'),
              'aria-label': t('capture'),
              onChange: (event) => setCapture(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void addItem()
                }
              },
            }),
            copyStatusLine(captureStatus) === null ? null : h('span', { className: 'dsh-todo-captureHint' }, t(COLUMN_KEY[captureStatus])),
          ),
          h(
            'div',
            { className: 'dsh-todo-filters' },
            h(
              'div',
              { className: 'dsh-todo-chips', role: 'group', 'aria-label': t('dateFilters') },
              dateChips.map(([value, key]) =>
                h(
                  'button',
                  {
                    key: value,
                    type: 'button',
                    className: 'dsh-todo-chip',
                    'aria-pressed': dateFilter === value ? 'true' : 'false',
                    onClick: () => setDateFilter(value),
                  },
                  t(key),
                ),
              ),
            ),
            tagCounts.length > 0
              ? h(
                  'div',
                  { className: 'dsh-todo-chips dsh-todo-tagChips', role: 'group', 'aria-label': t('tagFilters') },
                  tagCounts.map(([tag, count]) =>
                    h(
                      'button',
                      {
                        key: tag,
                        type: 'button',
                        className: 'dsh-todo-chip',
                        'aria-pressed': tagFilter.some((selected) => selected.toLowerCase() === tag.toLowerCase()) ? 'true' : 'false',
                        onClick: () => setTagFilter((current) => (current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag])),
                      },
                      `#${tag}`,
                      h('span', { className: 'dsh-todo-chipCount' }, count),
                    ),
                  ),
                )
              : null,
            dateFilter !== 'all' || tagFilter.length > 0 || query !== ''
              ? h('button', { type: 'button', className: 'dsh-todo-linkBtn', onClick: clearFilters }, t('clearFilters'))
              : null,
            h(
              'div',
              { className: 'dsh-todo-viewSwitch', role: 'group', 'aria-label': t('views') },
              h(
                'button',
                { type: 'button', className: 'dsh-todo-viewBtn', 'aria-pressed': view === 'board' ? 'true' : 'false', onClick: () => setView('board') },
                t('viewBoard'),
              ),
              h(
                'button',
                { type: 'button', className: 'dsh-todo-viewBtn', 'aria-pressed': view === 'archive' ? 'true' : 'false', onClick: () => setView('archive') },
                archived.length > 0 ? `${t('viewArchive')} ${archived.length}` : t('viewArchive'),
              ),
            ),
          ),
          inlineError === null ? null : h('div', { className: 'dsh-todo-inlineError', role: 'status' }, errorText(t, inlineError)),
          view === 'board' && !emptyBoard && !filteredEmpty
            ? h(
                'div',
                { className: 'dsh-todo-board' },
                STATUS_ORDER.map((status) =>
                  h(
                    'section',
                    { key: status, className: `dsh-todo-col${drag !== null && drag.over !== null && drag.over.column === status ? ' isDropTarget' : ''}`, 'aria-labelledby': `todo-col-${status}` },
                    h(
                      'div',
                      { className: 'dsh-todo-colHead' },
                      h('span', { className: 'dsh-todo-colGlyph' }, icon(COLUMN_ICON[status], 13)),
                      h('h2', { className: 'dsh-todo-colTitle', id: `todo-col-${status}` }, t(COLUMN_KEY[status])),
                      h('span', { className: 'dsh-todo-colCount' }, columns[status].length),
                      status === 'done'
                        ? null
                        : h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsh-todo-iconBtn',
                              'aria-label': t('addToColumn'),
                              title: t('addToColumn'),
                              onClick: () => {
                                setCaptureStatus(status)
                                setView('board')
                                if (captureRef.current !== null) captureRef.current.focus()
                              },
                            },
                            icon(ICON.plus, 12),
                          ),
                    ),
                    columnBody(status),
                  ),
                ),
              )
            : view === 'archive'
              ? h(
                'div',
                { className: 'dsh-todo-archive' },
                archived.length === 0
                  ? h('div', { className: 'dsh-todo-empty' }, t('emptyArchive'))
                  : archived.map((item) =>
                      h(
                        'div',
                        { key: item.id, className: 'dsh-todo-archiveRow' },
                        h(
                          'div',
                          { className: 'dsh-todo-archiveBody' },
                          h('div', { className: 'dsh-todo-archiveTitle' }, item.title),
                          h(
                            'div',
                            { className: 'dsh-todo-meta' },
                            item.completedAt === null ? null : h('span', { className: 'dsh-todo-metaItem' }, `${t('complete')} · ${formatShortDate(item.completedAt)}`),
                            item.archivedAt === null ? null : h('span', { className: 'dsh-todo-metaItem' }, `${t('archiveAction')} · ${formatShortDate(item.archivedAt)}`),
                            item.tags.slice(0, 3).map((tag) => h('span', { key: tag, className: 'dsh-todo-metaTag' }, `#${tag}`)),
                          ),
                        ),
                        h(
                          'div',
                          { className: 'dsh-todo-archiveActions' },
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsh-todo-btn dsh-todo-btnGhost',
                              onClick: async () => {
                                await controller.run('item/unarchive', { id: item.id })
                              },
                            },
                            icon(ICON.restore, 12),
                            h('span', null, t('restore')),
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsh-todo-btn dsh-todo-btnDanger',
                              onClick: () => askDelete(item),
                            },
                            icon(ICON.trash, 12),
                            h('span', null, t('remove')),
                          ),
                        ),
                      ),
                    ),
              )
          : emptyBoard
            ? h('div', { className: 'dsh-todo-empty dsh-todo-emptyBoard' }, h('p', null, t('emptyAll')))
            : h(
                'div',
                { className: 'dsh-todo-empty' },
                h('strong', null, t('emptyFiltered')),
                h('button', { type: 'button', className: 'dsh-todo-btn', onClick: clearFilters }, t('clearFilters')),
              ),
        ),
        confirm === null
          ? null
          : h(
              'div',
              {
                className: 'dsh-todo-overlay',
                onMouseDown: (event) => {
                  if (event.target === event.currentTarget) closeConfirm()
                },
              },
              h(
                'div',
                {
                  className: 'dsh-todo-dialog',
                  role: 'dialog',
                  'aria-modal': 'true',
                  'aria-labelledby': 'todo-confirm-title',
                  onKeyDown: (event) => {
                    if (event.key !== 'Tab') return
                    const buttons = event.currentTarget.querySelectorAll('button')
                    if (buttons.length === 0) return
                    const first = buttons[0]
                    const last = buttons[buttons.length - 1]
                    if (event.shiftKey && document.activeElement === first) {
                      event.preventDefault()
                      last.focus()
                    } else if (!event.shiftKey && document.activeElement === last) {
                      event.preventDefault()
                      first.focus()
                    }
                  },
                },
                h('h2', { className: 'dsh-todo-dialogTitle', id: 'todo-confirm-title' }, confirm.title),
                h('p', { className: 'dsh-todo-dialogBody' }, confirm.body),
                h(
                  'div',
                  { className: 'dsh-todo-dialogActions' },
                  h('button', { type: 'button', className: 'dsh-todo-btn', autoFocus: true, onClick: closeConfirm }, t('cancel')),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: confirm.confirmLabel === t('remove') ? 'dsh-todo-btn dsh-todo-btnDangerSolid' : 'dsh-todo-btn dsh-todo-btnPrimary',
                      onClick: () => {
                        const run = confirm.run
                        closeConfirm()
                        run()
                      },
                    },
                    confirm.confirmLabel,
                  ),
                ),
              ),
            ),
      )
    }

    function copyStatusLine(status) {
      return status === 'doing' ? status : null
    }

    /* ----------------------------------------------------------------- toasts */

    function Toasts(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const controller = props.controller
      const snapshot = useSyncExternalStore(controller.subscribe, controller.get)
      const toasts = snapshot.toasts
      if (toasts.length === 0) return null
      return h(
        'div',
        { className: 'dsh-todo-toasts', role: 'status', 'aria-live': 'polite' },
        toasts.map((toast) =>
          h(
            'div',
            { key: toast.id, className: 'dsh-todo-toast' },
            h('span', { className: 'dsh-todo-toastText' }, fmt(t(toast.textKey), toast.vars)),
            toast.action === null
              ? null
              : h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-todo-toastAction',
                    onClick: () => {
                      const action = toast.action
                      controller.dismissToast(toast.id)
                      action.run()
                    },
                  },
                  t(toast.action.labelKey),
                ),
            h(
              'button',
              { type: 'button', className: 'dsh-todo-toastClose', 'aria-label': t('close'), onClick: () => controller.dismissToast(toast.id) },
              icon(ICON.close, 11),
            ),
          ),
        ),
      )
    }

    /* ------------------------------------------------------------------- css */

    const CSS = `
.dsh-todo-root{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.dsh-todo-scroll{flex:1;min-height:0;overflow:auto;padding:28px clamp(20px,3vw,36px) 48px;display:flex;flex-direction:column;gap:14px}
html[data-platform='darwin'] .dsh-todo-scroll{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.dsh-todo-head{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px;max-width:1280px;width:100%;margin-inline:auto;position:sticky;top:0;z-index:6;padding-top:2px;padding-bottom:6px;background:var(--dsw-alias-bg-base)}
.dsh-todo-headMain{min-width:0}
.dsh-todo-title{margin:0;font-size:22px;line-height:28px;font-weight:500;letter-spacing:-0.01em}
.dsh-todo-sub{margin:4px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsh-todo-headActions{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.dsh-todo-search{display:flex;align-items:center;gap:6px;box-sizing:border-box;height:30px;max-width:280px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary)}
.dsh-todo-search:focus-within{border-color:var(--dsw-alias-border-l2);box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.dsh-todo-searchInput{flex:1;min-width:60px;height:26px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;outline:none}
.dsh-todo-searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsh-todo-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;height:30px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;white-space:nowrap;cursor:pointer}
.dsh-todo-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-todo-btn:disabled{opacity:.55;cursor:default}
.dsh-todo-btn:focus-visible,.dsh-todo-iconBtn:focus-visible,.dsh-todo-chip:focus-visible,.dsh-todo-viewBtn:focus-visible,.dsh-todo-segBtn:focus-visible,.dsh-todo-check:focus-visible,.dsh-todo-capture:focus-visible,.dsh-todo-input:focus-visible,.dsh-todo-linkBtn:focus-visible,.dsh-todo-card:focus-visible,.dsh-todo-toastAction:focus-visible,.dsh-todo-toastClose:focus-visible,.dsh-todo-menuItem:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.dsh-todo-btnPrimary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:var(--dsw-alias-label-primary-inverted);font-weight:500}
.dsh-todo-btnPrimary:hover{filter:brightness(1.05)}
.dsh-todo-btnGhost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}
.dsh-todo-btnGhost:hover{color:var(--dsw-alias-label-primary)}
.dsh-todo-btnDanger{border-color:transparent;background:transparent;color:var(--dsw-alias-state-error-primary)}
.dsh-todo-btnDanger:hover{background:var(--dsw-alias-interactive-bg-hover-danger)}
.dsh-todo-btnDangerSolid{border-color:transparent;background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-inverted);font-weight:500}
.dsh-todo-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsh-todo-iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-todo-iconBtn.isDanger:hover{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.dsh-todo-captureRow{display:flex;align-items:center;gap:10px;max-width:1280px;width:100%;margin-inline:auto}
.dsh-todo-filters{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-bottom:2px;max-width:1280px;width:100%;margin-inline:auto}
.dsh-todo-board{max-width:1280px;width:100%;margin-inline:auto}
.dsh-todo-archive{max-width:1280px;width:100%;margin-inline:auto}
.dsh-todo-inlineError{max-width:1280px;width:100%;margin-inline:auto}
.dsh-todo-empty{max-width:1280px;width:100%;margin-inline:auto}
.dsh-todo-capture{flex:1;box-sizing:border-box;height:38px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
.dsh-todo-capture::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsh-todo-capture:focus{border-color:var(--dsw-alias-brand-primary)}
.dsh-todo-captureHint{flex:none;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.dsh-todo-filters{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-bottom:2px}
.dsh-todo-chips{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.dsh-todo-tagChips{max-width:100%;overflow-x:auto;scrollbar-width:none}
.dsh-todo-tagChips::-webkit-scrollbar{display:none}
.dsh-todo-chip{display:inline-flex;align-items:center;gap:4px;box-sizing:border-box;height:26px;padding:0 9px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;white-space:nowrap;cursor:pointer}
.dsh-todo-chip:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-todo-chip[aria-pressed='true']{background:var(--dsw-alias-brand-primary-soft,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-brand-primary);font-weight:500}
.dsh-todo-chipCount{font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dsh-todo-viewSwitch{display:flex;align-items:center;gap:2px;margin-left:auto;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.dsh-todo-viewBtn{height:24px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dsh-todo-viewBtn[aria-pressed='true']{background:var(--dsw-alias-interactive-bg-active,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-primary);font-weight:500}
.dsh-todo-linkBtn{border:0;background:transparent;padding:2px;color:var(--dsw-alias-brand-primary);font:inherit;font-size:11.5px;cursor:pointer}
.dsh-todo-linkBtn.isMuted{color:var(--dsw-alias-label-tertiary)}
.dsh-todo-linkBtn:hover{text-decoration:underline}
.dsh-todo-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
.dsh-todo-col{min-width:0;display:flex;flex-direction:column;gap:8px;padding:10px 10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:transparent}
.dsh-todo-col.isDropTarget{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-todo-colHead{display:flex;align-items:center;gap:6px;min-height:26px;padding:0 2px}
.dsh-todo-colGlyph{display:inline-flex;color:var(--dsw-alias-label-tertiary)}
.dsh-todo-colTitle{margin:0;font-size:12px;line-height:16px;font-weight:500;color:var(--dsw-alias-label-secondary);letter-spacing:.02em}
.dsh-todo-colCount{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.dsh-todo-colHead .dsh-todo-iconBtn{margin-left:auto;width:22px;height:22px}
.dsh-todo-colBody{display:flex;flex-direction:column;gap:8px;min-height:52px}
.dsh-todo-colEmpty{display:flex;align-items:center;justify-content:center;min-height:64px;padding:8px;border:1px dashed var(--dsw-alias-border-l1);border-radius:9px;color:var(--dsw-alias-label-tertiary);font-size:11.5px;text-align:center}
.dsh-todo-card{position:relative;box-sizing:border-box;display:flex;flex-direction:column;gap:0;padding:9px 10px 9px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);cursor:pointer}
.dsh-todo-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.dsh-todo-card.isEditing{cursor:default;border-color:var(--dsw-alias-border-l2)}
.dsh-todo-card.isHighlighted{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px var(--dsw-alias-brand-primary-soft,rgba(99,102,241,.18))}
.dsh-todo-card.isDragging{opacity:.45}
.dsh-todo-card.isDropBefore{box-shadow:inset 0 2px 0 0 var(--dsw-alias-brand-primary)}
.dsh-todo-card.isDropAfter{box-shadow:inset 0 -2px 0 0 var(--dsw-alias-brand-primary)}
.dsh-todo-priorityBar{position:absolute;left:4px;top:8px;bottom:8px;width:2px;border-radius:2px;background:transparent}
.dsh-todo-priorityBar.is-high{background:var(--dsw-alias-label-secondary)}
.dsh-todo-priorityBar.is-medium{top:34%;bottom:34%;background:var(--dsw-alias-label-secondary);opacity:.45}
.dsh-todo-priorityBar.is-low{background:transparent}
.dsh-todo-cardHead{display:flex;align-items:flex-start;gap:8px}
.dsh-todo-check{flex:none;display:flex;align-items:center;justify-content:center;width:28px;height:28px;margin:-6px 0 0 -6px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary-inverted);cursor:pointer}
.dsh-todo-check:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-todo-checkBox{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:16px;height:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;background:transparent}
.dsh-todo-check[aria-pressed='true'] .dsh-todo-checkBox{border-color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-bg-base)}
.dsh-todo-cardBody{flex:1;min-width:0}
.dsh-todo-cardTitle{font-size:13px;line-height:19px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dsh-todo-card.isDone .dsh-todo-cardTitle{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}
.dsh-todo-meta{display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px;margin-top:3px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.dsh-todo-metaItem{white-space:nowrap;font-variant-numeric:tabular-nums}
.dsh-todo-metaItem.is-warn{color:var(--dsw-alias-state-warn-primary)}
.dsh-todo-metaItem.is-today{color:var(--dsw-alias-label-primary);font-weight:500}
.dsh-todo-metaItem.is-soon{color:var(--dsw-alias-label-secondary)}
.dsh-todo-metaIcon{display:inline-flex;color:var(--dsw-alias-label-tertiary)}
.dsh-todo-metaTag{white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.dsh-todo-cardActions{position:absolute;top:4px;right:4px;display:none;align-items:center;gap:2px;padding:1px 2px;border-radius:7px;background:var(--dsw-alias-bg-layer-1)}
.dsh-todo-card:hover .dsh-todo-cardActions,.dsh-todo-card:focus-within .dsh-todo-cardActions{display:flex}
.dsh-todo-editor{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsh-todo-input{box-sizing:border-box;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;outline:none}
.dsh-todo-input::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsh-todo-editorTitle{height:28px;font-size:13px}
.dsh-todo-editorNote{min-height:64px;padding:6px 8px;resize:vertical;line-height:18px}
.dsh-todo-editorRow{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.dsh-todo-editorLabel{flex:none;width:58px;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dsh-todo-date{width:130px;height:26px}
.dsh-todo-time{width:86px;height:26px}
.dsh-todo-select{height:26px;max-width:150px;padding-right:4px}
.dsh-todo-seg{display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base)}
.dsh-todo-segBtn{height:22px;padding:0 7px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer}
.dsh-todo-segBtn[aria-pressed='true']{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:500}
.dsh-todo-editorBlock{display:flex;flex-direction:column;gap:4px}
.dsh-todo-tagList{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.dsh-todo-tag{display:inline-flex;align-items:center;gap:2px;height:22px;padding:0 4px 0 7px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11.5px}
.dsh-todo-tagRemove{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dsh-todo-tagRemove:hover{color:var(--dsw-alias-label-primary)}
.dsh-todo-tagInput{height:24px;min-width:120px;flex:1;font-size:11.5px}
.dsh-todo-suggestions{display:flex;flex-wrap:wrap;gap:4px}
.dsh-todo-suggestion{height:22px;padding:0 6px;border:1px dashed var(--dsw-alias-border-l1);border-radius:5px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;cursor:pointer}
.dsh-todo-suggestion:hover{color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l2)}
.dsh-todo-editorActions{display:flex;justify-content:flex-end;gap:4px;padding-top:2px}
.dsh-todo-doneFoot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:2px}
.dsh-todo-menuWrap{position:relative}
.dsh-todo-menu{position:absolute;right:0;top:calc(100% + 4px);z-index:30;min-width:150px;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 24px rgb(0 0 0 / 18%)}
.dsh-todo-menuItem{display:block;box-sizing:border-box;width:100%;height:28px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;white-space:nowrap;cursor:pointer}
.dsh-todo-menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-todo-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px 16px;color:var(--dsw-alias-label-tertiary);font-size:12.5px;text-align:center}
.dsh-todo-empty strong{font-weight:500;color:var(--dsw-alias-label-secondary)}
.dsh-todo-emptyBoard{padding:24px 16px}
.dsh-todo-emptyBoard p{margin:0}
.dsh-todo-failed{padding-top:80px}
.dsh-todo-errorText{margin:0;max-width:520px;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.dsh-todo-inlineError{padding:6px 10px;border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-error-primary);font-size:12px}
.dsh-todo-archive{display:flex;flex-direction:column;gap:6px}
.dsh-todo-archiveRow{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
.dsh-todo-archiveBody{flex:1;min-width:0}
.dsh-todo-archiveTitle{font-size:13px;line-height:19px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-todo-archiveActions{display:flex;align-items:center;gap:2px}
.dsh-todo-overlay{position:fixed;inset:0;z-index:70;display:flex;padding:24px;background:rgb(0 0 0 / 34%)}
.dsh-todo-dialog{box-sizing:border-box;width:min(420px,100%);margin:auto;display:flex;flex-direction:column;gap:12px;padding:18px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:0 24px 60px rgb(0 0 0 / 28%)}
.dsh-todo-dialogTitle{margin:0;font-size:14px;font-weight:600;line-height:20px}
.dsh-todo-dialogBody{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary)}
.dsh-todo-dialogActions{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}
.dsh-todo-toasts{position:fixed;left:50%;bottom:28px;z-index:90;display:flex;flex-direction:column;align-items:center;gap:6px;transform:translateX(-50%);pointer-events:none}
.dsh-todo-toast{display:flex;align-items:center;gap:8px;max-width:min(480px,90vw);padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 30px rgb(0 0 0 / 20%);pointer-events:auto}
.dsh-todo-toastText{font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-todo-toastAction{border:0;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap}
.dsh-todo-toastClose{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dsh-todo-toastClose:hover{color:var(--dsw-alias-label-primary)}
.dsh-todo-glyph{position:relative;display:inline-flex;align-items:center;justify-content:center}
.dsh-todo-badge{position:absolute;top:-3px;right:-5px;box-sizing:border-box;min-width:13px;height:13px;padding:0 3px;border-radius:7px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted);font-size:9px;line-height:13px;font-weight:600;text-align:center;font-variant-numeric:tabular-nums;box-shadow:0 0 0 2px var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-base))}
.dsh-todo-badge.isOverdue{background:var(--dsw-alias-state-warn-primary)}
.dsh-todo-loading{padding-top:40px}
.dsh-todo-skeletonTitle{width:120px;height:24px;border-radius:6px;background:var(--dsw-alias-bg-skeleton,rgba(127,127,127,.14))}
.dsh-todo-skeletonCapture{height:38px;border-radius:10px;background:var(--dsw-alias-bg-skeleton,rgba(127,127,127,.12))}
.dsh-todo-skeletonHead{width:80px;height:16px;margin-bottom:10px;border-radius:5px;background:var(--dsw-alias-bg-skeleton,rgba(127,127,127,.14))}
.dsh-todo-skeletonCard{height:64px;margin-bottom:8px;border-radius:9px;background:var(--dsw-alias-bg-skeleton,rgba(127,127,127,.1))}
@media (max-width:1100px){
  .dsh-todo-board{grid-template-columns:repeat(3,minmax(280px,1fr));overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px}
  .dsh-todo-col{scroll-snap-align:start}
}
@media (max-width:768px){
  .dsh-todo-scroll{padding-left:16px;padding-right:16px}
  .dsh-todo-board{grid-template-columns:minmax(0,1fr);overflow:visible}
  .dsh-todo-viewSwitch{margin-left:0}
}
@media (prefers-reduced-motion:reduce){
  .dsh-todo-card,.dsh-todo-col,.dsh-todo-btn,.dsh-todo-chip{transition:none!important}
  .dsh-todo-card.isHighlighted{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}
}
`

    /* ------------------------------------------------------------------ boot */

    const inject = ['slots', 'locale', 'layout']

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'todo: dictionaries')
      // One stylesheet for the panel, the sidebar badge, and the reminder toasts:
      // all three outlive each other, so the sheet belongs to the plugin, not a page.
      ctx.effect(() => {
        if (typeof document === 'undefined') return () => {}
        const style = document.createElement('style')
        style.setAttribute('data-plugin', NS)
        style.textContent = CSS
        document.head.appendChild(style)
        return () => {
          style.remove()
        }
      }, 'todo: styles')
      const t = ctx.locale.bind(NS)
      const controller = createController()
      sharedController = controller
      controller.bindPanelOpen(() => {
        ctx.layout.selectPanel(PANEL_ID)
      })
      ctx.effect(
        () => () => {
          if (sharedController === controller) sharedController = null
          controller.dispose()
        },
        'todo: controller',
      )

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          { name: 'main', key: PANEL_ID, locale: NS, inject: () => ({ controller }) },
          Page,
        ),
      )

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 30, label: () => t('panel'), locale: NS },
          PanelIcon,
        ),
      )

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          { name: 'shell.overlay', id: 'todo.toasts', locale: NS, inject: () => ({ controller }) },
          Toasts,
        ),
      )

      // The slash command opens the panel and parks focus in the capture bar.
      // commandUi is optional and may not be registered yet: retry briefly, then
      // leave the sidebar entry as the only way in.
      const registerCommand = (ui) => {
        ctx.effect(() => {
          try {
            return ui.register({
              name: 'todo',
              label: () => t('panel'),
              description: () => t('commandDescription'),
              available: () => true,
              ui: {
                kind: 'action',
                run: () => {
                  controller.requestOpen()
                },
              },
            })
          } catch {
            return () => {}
          }
        }, 'todo: /todo command')
      }
      const findCommandUi = () => {
        try {
          return typeof ctx.get === 'function' ? ctx.get('commandUi') : null
        } catch {
          return null
        }
      }
      const immediate = findCommandUi()
      if (immediate !== null && immediate !== undefined) {
        registerCommand(immediate)
      } else {
        let attempts = 0
        let timer = null
        const attempt = () => {
          timer = null
          const ui = findCommandUi()
          if (ui !== null && ui !== undefined) {
            registerCommand(ui)
            return
          }
          attempts += 1
          if (attempts < 40) timer = setTimeout(attempt, 250)
        }
        ctx.effect(() => {
          timer = setTimeout(attempt, 250)
          return () => {
            if (timer !== null) clearTimeout(timer)
          }
        }, 'todo: /todo command retry')
      }
    }

    return { inject, apply }
  },
})
