# Behavior rules

One page for the rule files DeepSeek Harness reads, reached from the **Behavior rules** entry in the left sidebar. The page is a scope rail beside the document itself: pick a scope on the rail, read its `AGENTS.md` as rendered Markdown, and switch to the editor to change it.

## Preview first

The page opens on the rendered document, because a rule file is written to be read. The **Preview / Edit** switch above the pane moves between the two views, and the preview always renders the current draft — including edits you have not saved yet, so what you see is what you would write.

The renderer is built into the plugin and covers headings, paragraphs, emphasis, inline code, fenced code blocks, nested ordered and unordered lists, `- [ ]` / `- [x]` task items, blockquotes, horizontal rules, and pipe tables with column alignment.

Line breaks and leading indentation inside a paragraph are kept exactly as written, so a pasted `<env>` block, a set of paths, or any line-by-line block reads the same in the preview as it does in the editor — trailing double spaces are not needed to force a break.

It builds elements from a parsed tree and never injects HTML, so a rule file cannot put markup or script into the page: HTML in the file appears as literal text. Links open in a new browser tab, and only `http:`, `https:`, and `mailto:` become links.

## What it manages

| Scope | File | Effect |
| --- | --- | --- |
| Global rules | `<harness home>/AGENTS.md`, shown as `~/.dsh/AGENTS.md` | Applies to every session of this installation |
| Project rules | `<project directory>/AGENTS.md` for each Workspace | Applies to sessions started in that project |

The project list is the composition's Workspace registry, in the same order the sidebar shows it. A project whose `AGENTS.md` does not exist yet is marked **Not created**; saving creates the file. A project whose directory has disappeared cannot be saved — the page refuses instead of recreating the folder.

## Editing

- **Save** (or `Ctrl`/`Cmd` + `S`, in either view) writes the file. **Revert** drops the draft and returns to what is on disk.
- The status beside the buttons reads *Matches disk*, *Unsaved changes*, or *Saved*; a settled *Saved* clears itself after a few seconds.
- A draft survives switching scopes and leaving the page: it is kept for this browser tab, and a dot on the rail row marks a scope whose draft differs from disk. Closing or reloading the tab with an unsaved draft asks first.
- The footer counts lines and characters of the draft, and shows when the file was last modified.
- In a narrow window the rail becomes a row of scope chips above the editor.

## Limitations

- **One file, whole-file editing.** The page reads and writes the complete file, so a file above 2 MiB is listed but not editable.
- **Overwrite protection, not merging.** Each save names the version it was based on. When the file changed on disk in the meantime, the save is refused and the page offers **Reload** (take what is on disk, discarding the draft) or **Overwrite anyway**.
- **Drafts are per browser tab.** They are not shared between tabs and do not survive a tab close; they are discarded by a successful save and by **Revert**.
- **UTF-8 only.** The file is read and written as UTF-8 text; text is written back exactly as the editor holds it (LF line endings).
- **No code highlighting or images.** Fenced code is shown as plain monospace text, and an image reference is rendered as its alt text.
- **Two scopes.** The shared agents root (`~/.agents/AGENTS.md`) and nested `AGENTS.md` files below a project directory are not managed here.
