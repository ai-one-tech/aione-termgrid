# TermGrid AiOne

A plugin for batch managing multiple terminals - efficiently manage multiple terminal sessions in a grid layout

Supports VS Code, Open VSX, and JetBrains platforms

[中文](./README.md) | [English](./README_en.md)

## Features

- **Grid Layout** - Freely configure terminal grid rows and columns (1x1 to 4x4, up to 16 terminals)
- **Cell Merging** - Merge multiple cells to create larger terminal areas
- **Drag to Resize** - Drag row/column dividers to freely adjust cell sizes
- **Custom Sizing** - Precisely control each column/row width ratio via `colWidths`/`rowHeights`
- **Theme Sync** - Automatically follows VS Code theme for dark/light mode switching
- **Multi-language UI** - Supports Chinese and English interface
- **Terminal Search** - Search terminal content in zoomed view (case-sensitive, whole-word match)
- **Save As** - Easily copy configuration to a new file
- **Batch Control** - Start/stop/restart all terminals with one click
- **Platform Commands** - Configure different startup commands for Windows/macOS/Linux
- **Environment Variables** - Customize environment variables for each terminal
- **Startup Order** - Set terminal startup order and delay

## Screenshots

### Main Interface

![Main Interface - Dark Mode](docs/images/dark-main.png)

![Main Interface - Light Mode](docs/images/light-main.png)

### Grid View

![Grid View](docs/images/light-grid-view.png)

### Terminal Toolbar

![Toolbar View](docs/images/light-tools-view.png)

### Settings Panel

![Settings Panel](docs/images/light-setting.png)

![Grid Settings](docs/images/light-setting-grid.png)

![Grid Merge](docs/images/light-setting-grid-merge.png)

### Save As

![Save As](docs/images/light-saveas.png)

## Installation

### VS Code Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "TermGrid AiOne"
4. Click Install

### Manual Installation

```bash
# After downloading the .vsix file
code --install-extension aione-termgrid-0.1.0.vsix
```

### Open VSX Registry

Visit [Open VSX Registry](https://open-vsx.org/extension/AiOne/TermGrid) to install

### JetBrains Marketplace

1. Open your JetBrains IDE (IntelliJ IDEA, WebStorm, PyCharm, etc.)
2. Go to `Settings/Preferences → Plugins → Marketplace`
3. Search for "TermGrid AiOne"
4. Click Install and restart the IDE

## Quick Start

### 1. Create a New Configuration

**Option A: Using Command Palette**
- Press `Ctrl+Shift+P` to open the command palette
- Type `TermGrid: New TermGrid Config`
- Enter a configuration file name (lowercase letters, numbers, and hyphens only)

**Option B: Using Sidebar**
- Click the TermGrid icon in the left activity bar
- Click the "+" button in the top-right corner
- Enter a configuration name

### 2. Configuration File Location

Configuration files are saved in the workspace's `.term-grid` folder with the `.tg` extension

```
your-project/
├── .term-grid/
│   ├── my-config.tg
│   └── server-config.tg
└── src/
```

### 3. Start Terminals

After opening a `.tg` configuration file, click the **restart button** in the top-right corner to start all terminals

- **Global Restart** - The toolbar restart button starts all terminals
- **Single Cell Restart** - A cell's restart button starts only that terminal

### 4. Basic Operations

- **Adjust Layout** - Modify rows and columns in the settings panel
- **Merge Cells** - Select multiple cells in the settings panel to merge
- **Maximize Terminal** - Click the maximize icon in the top-right corner to zoom into a terminal
- **Search Content** - Press `Ctrl+F` in zoom mode to search terminal content
- **Drag Dividers** - Drag dividers between cells to resize
- **Save As** - Click the copy icon in the toolbar to save as a new file
- **Open Config Directory** - Click the folder icon in the sidebar to open the `.term-grid` directory

## Configuration

### .tg File Format

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
      win32: npm run dev:win
      darwin: npm run dev:mac
      linux: npm run dev:linux
    cwd: .
    env:
      NODE_ENV: development
    delay: 0
    borderColor: '#3b82f6'
  - id: cell-2
    title: Database
    command:
      default: docker-compose up
    cwd: ./docker
    delay: 500
    borderColor: '#10b981'
mergedCells: []
```

### Configuration Fields

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Configuration name | `"My Grid"` |
| `layout.rows` | Number of rows (1-4) | `2` |
| `layout.cols` | Number of columns (1-4) | `2` |
| `layout.colWidths` | Column width ratios (optional) | `[1, 2]` |
| `layout.rowHeights` | Row height ratios (optional) | `[1, 1]` |
| `cells[].id` | Unique cell ID | `"cell-1"` |
| `cells[].title` | Terminal title | `"Server"` |
| `cells[].command` | Startup command | `{ "default": "npm run dev" }` |
| `cells[].cwd` | Working directory (relative or absolute path) | `"."` |
| `cells[].env` | Environment variables (optional) | `{ "NODE_ENV": "dev" }` |
| `cells[].delay` | Startup delay (ms, 0-300) | `500` |
| `cells[].borderColor` | Border color (optional) | `"#3b82f6"` |
| `cells[].colSpan` | Column span (optional) | `2` |
| `cells[].rowSpan` | Row span (optional) | `2` |
| `mergedCells[]` | Merged cell list | `[{ "startRow": 0, ... }]` |

### Platform-Specific Commands

```yaml
command:
  default: npm run dev          # Default command (required)
  win32: npm run dev:win        # Windows
  darwin: npm run dev:mac       # macOS
  linux: npm run dev:linux      # Linux
```

### Working Directory

The `cwd` field supports the following formats:

- `"."` - Workspace root directory
- `"./sub-dir"` - Subdirectory under the workspace
- `"/absolute/path"` - Absolute path

### Environment Variables

Set environment variables for each terminal individually:

```yaml
env:
  NODE_ENV: development
  PORT: "3000"
```

### Preset Border Colors

| Color | Hex |
|-------|-----|
| Green | `#22c55e` |
| Blue | `#3b82f6` |
| Amber | `#f59e0b` |
| Red | `#ef4444` |
| Violet | `#8b5cf6` |
| Cyan | `#06b6d4` |
| Pink | `#ec4899` |
| Indigo | `#6366f1` |

## Layout Presets

| Preset | RowsxCols | Terminals |
|--------|-----------|-----------|
| 1x1 | 1x1 | 1 |
| 1x2 | 1x2 | 2 |
| 2x1 | 2x1 | 2 |
| 2x2 | 2x2 | 4 |
| 2x3 | 2x3 | 6 |
| 3x2 | 3x2 | 6 |
| 3x3 | 3x3 | 9 |
| 4x2 | 4x2 | 8 |
| 4x3 | 4x3 | 12 |
| 4x4 | 4x4 | 16 |

## Use Cases

### Full-Stack Development

```
┌─────────────────┬─────────────────┐
│   Frontend      │    Backend      │
│   npm run dev   │   npm run dev   │
├─────────────────┼─────────────────┤
│   Database      │    Redis        │
│   docker up     │   redis-cli     │
└─────────────────┴─────────────────┘
```

### Microservices Development

```
┌──────────┬──────────┬──────────┐
│ Service1 │ Service2 │ Service3 │
│  :3001   │  :3002   │  :3003   │
└──────────┴──────────┴──────────┘
```

### DevOps Operations

```
┌────────────────┬─────────────────┐
│    Docker      │    K8s          │
│  docker ps     │  kubectl get po │
├────────────────┼─────────────────┤
│    Logs        │    SSH          │
│  tail -f       │  ssh server     │
└────────────────┴─────────────────┘
```

## Terminal Support

Automatically selects the terminal based on the operating system:

| Platform | Default Terminal |
|----------|-----------------|
| Windows | PowerShell (pwsh preferred) or cmd.exe |
| macOS | User's default shell |
| Linux | User's default shell |

## Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| `Ctrl+F` | Search terminal content (zoom mode) |
| `Enter` | Next search result |
| `Shift+Enter` | Previous search result |
| `Esc` | Close search/dialog |

## System Requirements

- **VS Code**: 1.85.0 or higher
- **JetBrains**: 2023.1 or higher (IntelliJ IDEA, WebStorm, PyCharm, etc.)
- Windows, macOS, or Linux
- Node.js 18+ (development only)

## Bug Reports

If you encounter issues or have feature suggestions, please contact us:

- GitHub Issues: [https://github.com/ai-one-tech/aione-termgrid/issues](https://github.com/ai-one-tech/aione-termgrid/issues)
- Email: [tech@ai-one.org](mailto:tech@ai-one.org)

## Contributing

Issues and Pull Requests are welcome!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details

## Acknowledgments

- [xterm.js](https://github.com/xtermjs/xterm.js) - Terminal component
- [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) - Grid layout
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [VS Code](https://code.visualstudio.com/) - Development environment
- [JetBrains](https://www.jetbrains.com/) - Development environment

---

**Made with by [AiOne](https://ai-one.org) | Billy**
