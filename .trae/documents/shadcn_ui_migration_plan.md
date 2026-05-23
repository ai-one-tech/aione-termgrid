# 将 TermGrid 组件替换为 Shadcn UI 的实施计划

## 项目分析结论

当前项目是一个 VS Code 扩展，包含以下 React 组件：
- **主要组件**：`App.tsx`（主入口）
- **UI 组件**：
  - `FloatingToolbar.tsx` - 浮动工具栏
  - `SettingsPanel.tsx` - 设置面板（包含表单、标签页、选择器等）
  - `MaximizeModal.tsx` - 最大化模态框
  - `NewConfigModal.tsx` - 新建配置模态框
  - `TerminalGrid.tsx` - 终端网格
  - `TerminalCell.tsx` - 单个终端单元格
  - `Icons.tsx` - 图标组件

**当前技术栈**：
- React 18 + TypeScript
- Tailwind CSS 3
- 自定义 CSS 样式（使用 CSS 变量和 VS Code 主题）

---

## 实施步骤

### 1. 项目初始化与依赖安装

#### 1.1 安装 Shadcn UI 所需依赖
```bash
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
```

#### 1.2 初始化 Shadcn UI
- 使用 Shadcn CLI 初始化项目
- 配置组件目录为 `src/webview/components/ui`
- 更新 `tailwind.config.js` 以支持 Shadcn UI

---

### 2. 更新 Tailwind 配置

修改 `tailwind.config.js`：
- 添加 Shadcn UI 所需的主题配置（颜色、字体、阴影等）
- 配置动画支持

---

### 3. 创建基础 Shadcn UI 组件

需要安装的核心组件：
- Button
- Input
- Select
- Textarea
- Dialog (Modal)
- Sheet (抽屉)
- Tabs
- Card
- Label
- Separator
- Tooltip

---

### 4. Grid 区域自适应撑满页面的实现方案

**当前问题**：
- `TerminalGrid.tsx` 中使用固定 `width={1200}`，没有响应式
- `rowHeight={100}` 是固定值，不能根据容器高度自动调整
- 网格容器没有充分利用可用空间

**解决方案**：
1. 添加 `useRef` 获取 grid 容器元素
2. 使用 `ResizeObserver` API 监听容器尺寸变化
3. 动态计算 `width` 和 `rowHeight`：
   - `width` = 容器宽度 - padding
   - `rowHeight` = (容器高度 - 顶部工具栏高度) / (行数 * 3)（考虑布局缩放因子）
4. 使用 `useState` 管理动态尺寸
5. 确保 react-grid-layout 配置能够充分利用空间

---

### 5. 逐个替换组件

#### 5.1 替换 NewConfigModal.tsx
- 使用 `Dialog` 替换自定义模态框
- 使用 `Input` 替换自定义输入框
- 使用 `Button` 替换自定义按钮

#### 5.2 替换 MaximizeModal.tsx
- 使用 `Dialog` 组件
- 保持 XTerm 终端部分不变

#### 5.3 替换 SettingsPanel.tsx
- 使用 `Sheet`（抽屉）组件替换弹窗，改为右侧抽屉样式
- 使用 `Tabs` 组件替换标签页
- 使用 `Input`、`Select`、`Textarea` 替换表单元素
- 使用 `Button` 替换按钮

#### 5.4 替换 FloatingToolbar.tsx
- 使用 `Button` 组件
- 使用 `Tooltip` 为按钮添加提示

#### 5.5 优化 TerminalCell.tsx 和 TerminalGrid.tsx
- 使用 `Card` 组件包装终端单元格
- 保持核心终端功能不变
- **移除固定宽度（width: 1200），改用动态计算容器宽度**
- 调整 rowHeight，使网格能够更好地填充垂直空间
- 使用 `useResizeObserver` 或类似机制监听容器尺寸变化，动态更新 grid 宽度和布局
- 确保 grid 区域完全撑满页面可用空间（100% 宽高）
- 实现响应式布局，grid 会随页面尺寸变化自适应调整
- 优化 react-grid-layout 配置，确保网格能够正确填充容器

---

### 6. 样式与主题适配

- 保持与 VS Code 主题的集成
- 使用 CSS 变量 + Tailwind 类名的混合方案
- 确保暗色/亮色主题正常工作

---

### 7. 测试与验证

- 运行 `npm run dev` 测试开发环境
- 运行 `npm run lint` 检查代码质量
- 运行 `npm run typecheck` 检查类型安全

---

## 文件更改清单

| 文件 | 操作类型 |
|------|----------|
| `package.json` | 修改（添加依赖） |
| `tailwind.config.js` | 修改 |
| `src/webview/styles/index.css` | 修改 |
| `src/webview/components/ui/*` | 新增（Shadcn 组件） |
| `src/webview/components/FloatingToolbar.tsx` | 修改 |
| `src/webview/components/SettingsPanel.tsx` | 修改 |
| `src/webview/components/MaximizeModal.tsx` | 修改 |
| `src/webview/components/NewConfigModal.tsx` | 修改 |
| `src/webview/components/TerminalCell.tsx` | 修改 |
| `src/webview/components/TerminalGrid.tsx` | 修改 |

---

## 风险处理

1. **保持 VS Code 主题兼容性**：
   - 继续使用 `var(--vscode-*)` CSS 变量
   - 确保 Shadcn 组件能够正确继承主题色

2. **避免破坏性变更**：
   - 保持组件 props 接口不变
   - 逐步迁移，不一次性重构所有代码

3. **依赖冲突**：
   - 确保新依赖与现有依赖版本兼容
