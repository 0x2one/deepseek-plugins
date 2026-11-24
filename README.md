# DeepSeek Harness 插件集

为 DeepSeek Harness Web UI 编写的插件集合。每个插件都是一个独立的 bundle：装进某个 profile 后，界面里会多出一个入口或控件，随 Harness 一起加载，重启后仍然保留。

全部插件都是纯 ESM，没有构建步骤，也没有 npm 依赖——React 与客户端 UI 包由 Harness 自带解析。

## 插件一览

| 插件 | 出现位置 | 作用 |
| --- | --- | --- |
| [sidebar-collapse-all](./sidebar-collapse-all) | 侧边栏「工作区」标题行右侧 | 一键收起所有已展开的工作区分组 |
| [agents-md-manager](./agents-md-manager) | 侧边栏「行为规则」 | 预览并编辑全局与各项目的 `AGENTS.md` |
| [browser-bookmarks](./browser-bookmarks) | 侧边栏「浏览器书签」 | 按分类管理书签、从本机浏览器导入，并按所选浏览器打开 |

三个插件互不依赖，可以只装其中一个。

## 安装

要求：已安装 DeepSeek Harness，并能打开它的 Web UI。

1. 在 Harness 中打开「插件」页。
2. 点「添加插件」，选择「安装第三方插件」，填入本仓库中要安装的插件目录（绝对路径），例如 `D:\code\deepseek-plugins\browser-bookmarks`。
3. 安装完成后插件出现在列表中并处于启用状态；若页面提示需要重启，重启 DSH 后再打开 Web UI。在同一页可以停用或卸载。

插件装在当前 profile 里，对该 profile 的所有会话生效。卸载插件不会删除它已经写下的数据（例如书签文件）。

## sidebar-collapse-all

在侧边栏「工作区」标题右侧的按钮组末尾加一个按钮，一次收起所有已展开的工作区分组（含「未分组」）。

- 只在分组视图出现：侧边栏收成 56px 图标栏、展开行内搜索、或切到「扁平」会话列表时，按钮跟宿主自己的头部按钮一起隐藏。
- 没有已展开的分组时图标变淡并带 `aria-disabled="true"`，点击不做任何事。
- 收起动作逐个触发各分组行自己的展开开关，展开状态仍由宿主持久化，插件不写第二份状态。
- 收起后通过视觉隐藏的 `role="status"` 区域播报「已收起 N 个工作区」。
- 键盘可达：可 Tab 聚焦、Enter/Space 触发，焦点环沿用宿主 token。

**已知限制**：嵌套工作区视图里，若子分组自身展开而父分组收起，该子分组行未被挂载，按钮只能收起已挂载的行，子分组会在下次展开父分组时仍是展开状态。

## agents-md-manager

一个页面管理 Harness 读取的规则文件，入口是侧边栏的「行为规则」。

| 范围 | 文件 | 生效于 |
| --- | --- | --- |
| 全局规则 | `<DSH_HOME>/AGENTS.md`（默认即 `~/.dsh/AGENTS.md`） | 本安装的所有会话 |
| 项目规则 | 每个 Workspace 目录下的 `AGENTS.md` | 在该项目中启动的会话 |

- 左侧是范围栏，右侧是文档本身；默认打开渲染后的预览，`Preview / Edit` 切换编辑。
- 预览始终渲染当前草稿（包括尚未保存的改动），所见即所写。
- 内置 Markdown 渲染器：标题、段落、强调、行内代码、围栏代码块、嵌套有序/无序列表、`- [ ]` 任务项、引用、分隔线、带列对齐的管道表格；从不注入 HTML，只把 `http:`、`https:`、`mailto:` 变成链接，并在新标签页打开。
- 保存用 `Ctrl`/`Cmd` + `S`，两种视图都有效；`Revert` 丢弃草稿回到磁盘内容。状态在 *Matches disk* / *Unsaved changes* / *Saved* 之间切换。
- 草稿按浏览器标签页保存：切换范围、离开页面再回来都还在，范围行上的圆点标记与磁盘不同的草稿；关闭或刷新有未保存草稿的标签页会先询问。
- 覆盖保护而非合并：每次保存都带上它所基于的版本，磁盘文件在此期间被改动则拒绝保存，并提供 `Reload`（取磁盘内容、丢弃草稿）或 `Overwrite anyway`。
- 页脚显示草稿的行数、字符数与文件最后修改时间；窄窗口下范围栏变成顶部的一排范围按钮。

**限制**：单文件整体读写，超过 2 MiB 的文件只列出不可编辑；仅 UTF-8（LF 换行），没有代码高亮与图片；不管理共享的 `~/.agents/AGENTS.md`，也不管理项目目录下嵌套的 `AGENTS.md`。更完整的说明见 [docs/DETAIL.md](./agents-md-manager/docs/DETAIL.md)。

## browser-bookmarks

侧边栏「浏览器书签」打开一个书签面板。

- 分类整理：新增、重命名、删除分类（删除分类时书签进入「未分类」）、拖拽排序（也可聚焦后按 `Alt` + `↑`/`↓`）；另有「全部」「星标」「未分类」三个固定视图。
- 搜索标题与地址；多选后批量移动、删除、加星，或「新建分类并移入」。
- 从本机浏览器导入书签：直接读取 Chrome、Edge、Brave、Vivaldi、Opera 自己的 `Bookmarks` 文件，文件夹变成分类，已存在的地址跳过，导入结果报告新增与跳过数量。
- 打开方式逐个可选：系统默认浏览器、指定浏览器（Chromium 系还可指定用户配置）、或 Harness 内置的浏览器标签页。
- 备份与恢复：把当前书签与分类导出为一个 JSON 文件；恢复前先预览文件内容并要求确认，覆盖前会给当前数据留一份快照。
- 只接受 `http:` 与 `https:` 地址，书签不会触发本地协议处理器。

**数据位置**：`<DSH_HOME>/browser-bookmarks/bookmarks.json`，快照在其下的 `backups/`（保留最近 10 份）。读写是原子的（先写临时文件再改名），损坏的文件按空书签库读取。

**限制**：Firefox 只能作为打开目标，不能导入（它把书签存在 `places.sqlite` 里，本插件不带 SQLite 读取器）；内置浏览器标签属于某个会话，需要先打开一个会话。

## 目录结构

```
deepseek-plugins/
├── LICENSE
├── README.md
├── agents-md-manager/
│   ├── index.js             Host 半边：注册 /agents-md 路由
│   ├── client.js            Client 半边：主面板与内置 Markdown 渲染
│   ├── cordis.patch.yml     安装时插入 profile 的插件行
│   ├── package.json
│   ├── locale/              zh.json、en.json（插件名与描述）
│   ├── docs/DETAIL.md       插件详情页
│   ├── icon.svg
│   └── tests/               不依赖 Harness 的测试脚本
├── browser-bookmarks/
│   ├── index.js             Host 半边：存储、导入、启动浏览器、路由
│   ├── client.js            Client 半边：书签面板
│   ├── cordis.patch.yml
│   ├── package.json
│   ├── locale/
│   └── icon.svg
└── sidebar-collapse-all/
    ├── index.js             空的 Host 半边（只导出 apply）
    ├── client.js            挂载到侧边栏标题行的按钮
    ├── cordis.patch.yml
    ├── package.json
    ├── locale/              zh、en、ja、de、es、fr、pt、ru
    ├── README.md
    └── icon.svg
```

## 开发

每个目录都是一个标准的 Harness bundle：

- `package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`，后者把插件行插入 profile；`dsh.client` 声明 Web 客户端半边以及它 `inject` 的客户端包。
- Host 半边是 Cordis 函数插件，导出 `name`、`inject` 与 `apply`；通过 `webServer` 注册路由，并且每个路由都先向 `connection` 服务请求拒绝结果，让 Host/Origin 校验与浏览器鉴权发生在读盘或起进程之前。
- Client 半边用 `window.__ModuleLoader__.load` 注册，通过宿主提供的 `require` 取 React，并向 `slots` 注册页面或侧边栏入口。
- 路由参数与请求体都有上限（例如书签写入体 512 KiB、规则文件保存体 4 MiB），写入使用临时文件加改名。

新增插件：复制一个现有目录，改掉 `package.json` 的 `name`、`cordis.patch.yml` 的 `id`、`locale/*.json` 与 `icon.svg` 即可。

### 测试

`agents-md-manager` 带有不依赖 Harness 与浏览器的测试脚本。脚本参数是要测的插件目录，必须是绝对路径：

```powershell
node agents-md-manager/tests/markdown.mjs      "$PWD/agents-md-manager"
node agents-md-manager/tests/host-routes.mjs   "$PWD/agents-md-manager"
node agents-md-manager/tests/client-statics.mjs "$PWD/agents-md-manager"
```

三个脚本分别覆盖内置 Markdown 渲染、Host 路由（使用临时 `DSH_HOME` 与项目目录）、以及 Client 模块的静态检查与 slot 注册；全部输出 `ALL PASSED` 即通过。

## 兼容性

这些插件依赖 Harness 当前版本发布的一些内部约定，升级 Harness 后可能部分或完全失效：

- `sidebar-collapse-all` 直接挂到侧边栏标题行的 `data-sidebar-workspace-header`，并依赖 `data-sidebar-list-area`、`data-row-key="workspace:…"` 与 `aria-expanded` 找到分组行。宿主更换这些属性或改变头部结构时，按钮会退回为不显示（15 秒内找不到标题行则在控制台告警）。
- 另外两个插件依赖 `webServer`、`connection` 服务，以及 `@deepseek-ai/dsh-client-{locale,ui-layout,ui-sidebar}`（`sidebar-collapse-all` 另含 `ui-workspace`）。这些包由 Harness 自带解析，因此 `package.json` 里没有声明依赖。

## 许可证

[MIT](./LICENSE) © 2026 zero2one
