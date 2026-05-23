# AiOne TermGrid

批量管理多个终端的 VS Code 插件 - 在网格布局中高效管理多个终端会话

[English](./README.md) | [中文](./README_zh.md)

## ✨ 功能特点

- 🎨 **网格布局** - 自由配置终端网格的行列数（1x1 到 4x4）
- 🔗 **单元格合并** - 合并多个单元格创建更大的终端区域
- 🌈 **主题跟随** - 自动跟随 VS Code 主题切换深色/浅色模式
- 🌍 **多语言界面** - 支持中文和英文界面
- 📏 **拖动调整大小** - 拖动行列分割线自由调整单元格大小
- 🔍 **终端搜索** - 在放大视图中搜索终端内容（支持大小写敏感、全词匹配）
- 💾 **另存为** - 轻松复制配置为新文件
- 🔄 **批量控制** - 一键启动/停止/重启所有终端

## 📦 安装

### VS Code Marketplace（推荐）

1. 打开 VS Code
2. 进入扩展市场（Ctrl+Shift+X）
3. 搜索 "AiOne TermGrid"
4. 点击安装

### 手动安装

```bash
# 下载 .vsix 文件后
code --install-extension aione-termgrid-0.1.0.vsix
```

### VSX Open

访问 [VSX Open Marketplace](https://open-vsx.org/extension/AiOne/TermGrid) 进行安装

## 🚀 快速开始

### 1. 创建新配置

**方式一：使用命令面板**
- 按 `Ctrl+Shift+P` 打开命令面板
- 输入 `TermGrid: New TermGrid Config`
- 选择网格布局（如 2x2）
- 输入配置文件名

**方式二：使用侧边栏**
- 点击左侧活动栏的 TermGrid 图标
- 点击右上角的 "+" 按钮
- 选择布局并命名

### 2. 配置文件位置

配置文件保存在工作区的 `.term-grid` 文件夹中，文件扩展名为 `.tg`

```
your-project/
├── .term-grid/
│   ├── my-config.tg
│   └── server-config.tg
└── src/
```

### 3. 启动终端

打开配置文件后，点击右上角的 **重启按钮** 启动所有终端

- 🔄 **全局重启** - 工具栏的重启按钮启动所有终端
- 🎯 **单格重启** - 单个格子的重启按钮只启动该终端

### 4. 基本操作

- **调整布局** - 在设置面板中修改行列数
- **合并单元格** - 在设置面板中选择多个格子进行合并
- **放大终端** - 点击右上角的最大化图标放大单个终端
- **搜索内容** - 放大模式下按 `Ctrl+F` 搜索终端内容
- **拖动分割线** - 拖动格子之间的分割线调整大小
- **另存配置** - 点击工具栏的复制图标另存为新文件

## ⚙️ 配置说明

### .tg 文件格式

```yaml
name: My Terminal Grid
layout:
  rows: 2
  cols: 2
cells:
  - id: cell-1
    title: Server
    command:
      default: npm run dev
      windows: npm run dev
      linux: npm run dev
      darwin: npm run dev
    workingDirectory: ${workspaceFolder}
    order: 1
    delay: 0
    borderColor: '#3b82f6'
  - id: cell-2
    title: Database
    command:
      default: docker-compose up
    workingDirectory: ${workspaceFolder}/docker
    order: 2
    delay: 500
    borderColor: '#10b981'
mergedCells: []
```

### 配置字段说明

| 字段 | 说明 | 示例 |
|------|------|------|
| `name` | 配置名称 | `"My Grid"` |
| `layout.rows` | 行数 (1-4) | `2` |
| `layout.cols` | 列数 (1-4) | `2` |
| `cells[].id` | 单元格唯一ID | `"cell-1"` |
| `cells[].title` | 终端标题 | `"Server"` |
| `cells[].command` | 启动命令 | `{ "default": "npm run dev" }` |
| `cells[].workingDirectory` | 工作目录 | `"${workspaceFolder}"` |
| `cells[].order` | 启动顺序 | `1` |
| `cells[].delay` | 启动延迟(ms) | `500` |
| `cells[].borderColor` | 边框颜色 | `"#3b82f6"` |
| `mergedCells[]` | 合并单元格列表 | `[{ "startRow": 0, ... }]` |

### 平台特定命令

```yaml
command:
  default: npm run dev          # 默认命令
  windows: npm run dev:win      # Windows
  linux: npm run dev:linux      # Linux
  darwin: npm run dev:mac       # macOS
```

### 环境变量

- `${workspaceFolder}` - 当前工作区路径
- `${workspaceFolderBasename}` - 工作区文件夹名称

## 🎯 使用场景

### 1. 全栈开发

```
┌─────────────────┬─────────────────┐
│   Frontend      │    Backend      │
│   npm run dev   │   npm run dev   │
├─────────────────┼─────────────────┤
│   Database      │    Redis        │
│   docker up     │   redis-cli     │
└─────────────────┴─────────────────┘
```

### 2. 微服务开发

```
┌──────────┬──────────┬──────────┐
│ Service1 │ Service2 │ Service3 │
│  :3001   │  :3002   │  :3003   │
└──────────┴──────────┴──────────┘
```

### 3. DevOps 运维

```
┌────────────────┬─────────────────┐
│    Docker      │    K8s          │
│  docker ps     │  kubectl get po  │
├────────────────┼─────────────────┤
│    Logs        │    SSH          │
│  tail -f       │  ssh server      │
└────────────────┴─────────────────┘
```

## 🛠️ 终端支持

根据操作系统自动选择终端：

| 平台 | 终端 |
|------|------|
| Windows | PowerShell 或 cmd.exe |
| macOS | 用户默认 shell |
| Linux | 用户默认 shell |

## 🔧 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+F` | 搜索终端内容（放大模式） |
| `Enter` | 下一个搜索结果 |
| `Shift+Enter` | 上一个搜索结果 |
| `Esc` | 关闭搜索/对话框 |

## 📋 系统要求

- VS Code 1.85.0 或更高版本
- 支持 Windows、macOS、Linux
- Node.js 18+（仅开发需要）

## 🐛 问题反馈

如果您遇到问题或有功能建议，请通过以下方式联系我们：

- GitHub Issues: [https://github.com/aione/TermGrid/issues](https://github.com/aione/TermGrid/issues)
- 邮箱: [tech@ai-one.org](mailto:tech@ai-one.org)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 Apache License 2.0 开源 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [xterm.js](https://github.com/xtermjs/xterm.js) - 终端组件
- [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) - 网格布局
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [VS Code](https://code.visualstudio.com/) - 开发环境

## 📈 版本历史

详见 [CHANGELOG.md](CHANGELOG.md)

---

**Made with ❤️ by [AiOne](https://ai-one.org) | Billy**
