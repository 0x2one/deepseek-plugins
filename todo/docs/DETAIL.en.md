# Tasks

A private todo board in the left sidebar: To do, In progress, and Done. Data stays on this machine, and the agent never sees it.

## Using it

- Select **Tasks** in the sidebar (after Plugins and Automation tasks), or type `/todo`.
- Type a title in the capture bar and press **Enter**. New items land at the top of **To do**.
- Drag a card to change columns or order; dropping into **Done** completes it, and a repeating task spawns its next occurrence.
- Select a card to edit its note, due date (optional time), priority, tags, and repeat rule.
- Keyboard: `/` search, `c` capture, `Enter` edit, `x` complete, `Alt+arrows` reorder or move, `Esc` cancel.

## Behavior

- The sidebar badge counts unfinished items and turns to the warning color while anything is overdue. Above 99 it reads `99+`.
- Reminders work only while the Harness page is open: a task with a specific time shows one in-app notice when due. Tasks that came due while the page was closed are not replayed; they appear as overdue next time.
- Repeats (daily, weekdays, weekly, monthly) derive from the due date. Completing one creates the next occurrence; undoing completion removes it again when it is still untouched.
- Completed cards stay in **Done** until archived. The archive view can restore or permanently delete them.

## Data

- `$DSH_HOME/todo/todos.json` (default `~/.dsh/todo/todos.json`), written atomically.
- Archiving all, deleting, and reranking snapshot the document into `$DSH_HOME/todo/backups/`; the newest 10 are kept.
- A damaged document is renamed to `todos.corrupt-<time>.json` and the plugin starts empty instead of overwriting it.

## Limits

- No agent integration: no tools, no session events, no prompt text.
- No subtasks, collaboration, cloud sync, or system notifications.
- The badge lives inside the sidebar icon cell; very narrow icon cells may clip it.
