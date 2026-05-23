[OPEN] TG 打开报错调试记录

## Session
- sessionId: `tg-proposed-api`
- 日期: 2026-05-23
- 症状: 打开 `.tg` 文件时，控制台出现 `Unrecognized feature: 'local-network-access'`、iframe sandbox 警告，以及 `You must set the allowProposedApi option to true to use proposed API`，TG 页面未正常工作。

## 初始假设
- H1: 真正导致 TG 失败的是 `@xterm/addon-unicode11` 访问了 xterm 的 proposed API，触发异常并中断终端初始化。
- H2: `local-network-access` 是 VS Code webview 注入的 `Permissions-Policy`/iframe 特性告警，只是浏览器兼容性提示，不会阻止 TG 渲染。
- H3: iframe `allow-scripts` + `allow-same-origin` 是 VS Code webview 的通用安全警告，不是扩展代码主动设置，和当前失败无直接因果关系。
- H4: 当前项目使用了 beta 版 `xterm`/addons，版本组合要求 proposed API，而 VS Code webview 环境默认不允许，导致打开 TG 时崩溃。
- H5: 即使移除 `unicode11`，`webgl` addon 仍可能带来兼容性问题，但从当前堆栈看它不是第一现场。

## 证据
- 用户提供的运行时堆栈包含 `Error: You must set the allowProposedApi option to true to use proposed API`。
- 同一堆栈明确经过 `get unicode`、`loadAddon`、`activate`，与 xterm Unicode addon 初始化路径一致。
- `src/webview/lib/xtermAddons.ts` 中存在 `Unicode11Addon` 初始化，并在加载后调用 `terminal.unicode.activeVersion = '11'`。
- `src/webview/components/TerminalCell.tsx` 与 `src/webview/components/MaximizeModal.tsx` 都会在终端初始化早期调用 `loadXtermAddons()`，因此一旦这里抛错，会直接影响 `.tg` 打开。
- `src/extension/providers/termGridEditorProvider.ts` 未自定义 iframe sandbox 或 permissions policy；`local-network-access` 与 iframe sandbox 警告不在扩展业务代码控制范围内。
- 执行 `npm run build` 成功，说明移除 Unicode11 初始化后项目可正常完成 webview 与扩展构建。

## 结论
- H1 成立：真正导致 TG 打不开的是 `Unicode11Addon`/`terminal.unicode.activeVersion` 触发 proposed API 检查。
- H2、H3 成立：`local-network-access` 与 iframe sandbox 警告属于 VS Code/Chromium 宿主告警，不是当前失败根因。
- H4 成立：当前 xterm beta 依赖组合中，Unicode11 相关能力依赖 proposed API，不适合直接在当前 VS Code webview 环境使用。
- 已做最小修复：从 `src/webview/lib/xtermAddons.ts` 移除 Unicode11 addon 的加载与激活逻辑，保留 `fit`、`search` 与带降级保护的 `webgl`。
