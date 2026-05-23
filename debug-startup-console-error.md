[OPEN] startup-console-error

# Debug Session: startup-console-error

## Symptom
- 启动项目后，控制台出现报错。
- 当前已见到的疑似项目相关报错包括：
  - `GET vscode-file://.../src/webview/iconv-lite.tsq net::ERR_FILE_NOT_FOUND`
  - `ERR 加载未加密 - 有关详细信息，请参阅日志。`
- 截图中也混有大量 VS Code / 其他扩展 / 浏览器安全策略警告，需先排除非本项目噪音。

## Hypotheses
1. Webview 或构建产物中引用了错误的文件路径/文件名，尤其是 `iconv-lite.tsq` 这类看起来像拼写错误的资源路径。
2. 某处动态导入、source map、或资源重写逻辑把 `.ts` / `.tsx` 解析成了不存在的 `.tsq`，导致 `ERR_FILE_NOT_FOUND`。
3. 控制台中的“加载未加密”报错来自扩展启动时读取本地配置/缓存/终端数据失败，而不是 UI 主逻辑本身。
4. 当前看到的多条 CSP、TrustedScript、workbench 警告主要来自 VS Code 宿主环境，不是 `aione-termgrid` 自身问题，真正需要修的是少数带有你项目路径的错误。
5. 依赖升级后构建产物、缓存或 sourcemap 不一致，导致启动时仍引用旧路径或错误映射。

## Plan
- 先在代码和构建产物中搜索 `iconv-lite`、`.tsq`、相关报错文本。
- 再启动项目并收集终端输出，确认是否能稳定复现。
- 依据证据决定是修路径、修构建配置，还是清理错误引用。

## Evidence Log
- `package.json` 的 `contributes.languages[].icon.light` 指向 `media/icon-light.svg`。
- `package.json` 的 `contributes.languages[].icon.dark` 指向 `media/icon-dark.svg`。
- `package.json` 的扩展主图标 `icon` 指向 `media/icon.png`。
- 仓库 `media/` 目录当前仅存在 `termgrid-icon.svg`，缺少上述两个文件。
- 因此 manifest 中至少有 3 个资源路径当前指向不存在文件：`icon.png`、`icon-light.svg`、`icon-dark.svg`。
- 该证据与截图中的 `vscode-file://.../media/icon-light.svg net::ERR_FILE_NOT_FOUND` 现象一致。
- 全代码库、构建产物、`node_modules` 中未发现 `iconv-lite` 或 `.tsq` 的直接引用，说明此前误读的可疑路径大概率不是主问题。

## Status
- 已定位 1 个高置信度启动期资源缺失问题，尚未修改业务逻辑。
