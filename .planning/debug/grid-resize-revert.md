---
status: awaiting_human_verify
trigger: "Investigate issue: grid-resize-revert\n\nSummary: 拖动grid间的调整大小的分割条，释放后又恢复原大小，没有生效"
created: 2026-05-24T00:00:00+08:00
updated: 2026-05-24T00:00:00+08:00
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: fixed; awaiting user confirmation in real VS Code webview workflow
test: user manually drags grid splitter, releases mouse, and observes whether new size remains
expecting: splitter remains at the released position because layout.colWidths/rowHeights now persist exact percentages through re-render
next_action: wait for human verification response

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: 拖动grid间的分割条调整大小后，释放鼠标应保持新的大小
actual: 释放鼠标后大小恢复原状，调整没有生效
errors: 无错误信息
reproduction: 拖动grid间的调整大小分割条，释放后恢复
started: 这个功能曾经正常工作过，最近出现问题

## Eliminated
<!-- APPEND only - prevents re-investigating -->


## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-05-24T00:00:00+08:00
  checked: .planning/debug/knowledge-base.md
  found: No knowledge base file exists; no prior known-pattern hypothesis available.
  implication: Must investigate from source evidence.

- timestamp: 2026-05-24T00:00:00+08:00
  checked: source search for resize/grid/splitter/drag handlers
  found: Relevant references center on src/webview/App.tsx and src/webview/components/TerminalGrid; no dedicated *grid* or *resize* filenames found.
  implication: Need to trace grid layout resize callbacks from TerminalGrid into App config persistence.

- timestamp: 2026-05-24T00:00:00+08:00
  checked: src/webview/components/TerminalGrid.tsx, src/webview/App.tsx, src/shared/schema.ts, src/shared/types.ts
  found: TerminalGrid keeps dragged percentages in local colSizes/rowSizes, but on mouseup writes rounded integer colSpan/rowSpan to cells. Its config-change effect then calls getDefaultSizes from spans, not the dragged percentages. The schema already supports layout.colWidths and layout.rowHeights, but TerminalGrid does not use them.
  implication: Visual resize can revert because the exact dragged sizes are never persisted; they are replaced by coarse/default span-derived sizes on release/re-render.

- timestamp: 2026-05-24T00:00:00+08:00
  checked: npm run typecheck and npm run build:webview
  found: TypeScript typecheck completed successfully. Webview production build completed successfully with an existing Vite CJS API deprecation notice and chunk-size warning, but no build failure.
  implication: The code change is type-safe and webview bundle compiles.

- timestamp: 2026-05-24T00:00:00+08:00
  checked: npm test
  found: Existing Vitest suite passed: 3 test files, 26 tests. Test output includes pre-existing TermGrid stdout logs from ptyManager tests.
  implication: Existing extension terminal behavior was not regressed by the webview resize fix.

- timestamp: 2026-05-24T00:00:00+08:00
  checked: npm run lint after initial fix
  found: Lint failed on edited TerminalGrid because layout became unused and the pre-existing config-sync effect called setState synchronously. Lint also reported an unrelated pre-existing warning in GridResizer.tsx.
  implication: Need to refactor TerminalGrid fix to derive committed sizes with useMemo and use local state only for active drag overrides.

- timestamp: 2026-05-24T00:00:00+08:00
  checked: npm run lint, npm run typecheck, npm run build:webview, npm test after refactor
  found: TerminalGrid lint errors resolved. Typecheck passed. Webview build passed. Existing Vitest suite passed: 3 files, 26 tests. Lint still reports one unrelated pre-existing warning in src/webview/components/GridResizer.tsx: missing measureSplitters dependency.
  implication: The resize fix is self-verified; final confirmation requires manual VS Code webview interaction.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: TerminalGrid only stores dragged grid divider sizes in local colSizes/rowSizes during mousemove. On mouseup it converts those exact percentages into rounded integer cell colSpan/rowSpan values, then its config sync effect recalculates default percentage sizes from spans and overwrites local state. The existing schema has layout.colWidths and layout.rowHeights for persistent visual sizes, but TerminalGrid ignores them.
fix: Updated TerminalGrid to initialize/sync column and row sizes from config.layout.colWidths/config.layout.rowHeights when present, and to persist exact dragged colSizes/rowSizes into those layout fields on mouseup instead of converting them into rounded cell colSpan/rowSpan values.
verification: Self-verified with npm run typecheck, npm run build:webview, and npm test passing. npm run lint has no errors in the edited file; it reports one unrelated pre-existing warning in D:/SourceCode/ai-one-tech/aione-termgrid/src/webview/components/GridResizer.tsx.
files_changed: ["D:/SourceCode/ai-one-tech/aione-termgrid/src/webview/components/TerminalGrid.tsx"]
