import { z } from 'zod';

// Platform-specific command schema
export const PlatformCommandSchema = z.object({
  win32: z.string().optional(),
  darwin: z.string().optional(),
  linux: z.string().optional(),
  default: z.string(),
});

// Terminal cell configuration
export const TerminalCellSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(50),
  borderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  cwd: z.string(),
  command: PlatformCommandSchema.nullable().optional(),
  env: z.record(z.string()).optional(),
  envFiles: z.array(z.string()).optional(),
  order: z.number().int().min(1).default(1),
  delay: z.number().int().min(0).max(60000).default(0),
  colSpan: z.number().int().min(1).optional(),
  rowSpan: z.number().int().min(1).optional(),
});

// Grid layout configuration
export const GridLayoutSchema = z.object({
  rows: z.number().int().min(1).max(20),
  cols: z.number().int().min(1).max(20),
  colWidths: z.array(z.number().min(0.1)).optional(),
  rowHeights: z.array(z.number().min(0.1)).optional(),
});

// Merged cell definition
// start/end are [row, col] in grid coordinates
export const MergedCellSchema = z.object({
  id: z.string(),
  startRow: z.number().int().min(0),
  startCol: z.number().int().min(0),
  endRow: z.number().int().min(0),
  endCol: z.number().int().min(0),
});

// Main configuration schema
export const TermGridConfigSchema = z.object({
  name: z.string().min(1).max(100),
  layout: GridLayoutSchema,
  cells: z.array(TerminalCellSchema).min(1).max(50),
  mergedCells: z.array(MergedCellSchema).optional().default([]),
  language: z.string().optional().default('zh'),
  initialDelay: z.number().int().min(0).max(60000).default(2000),
});

// Layout preset
export const LayoutPresetSchema = z.object({
  name: z.string(),
  rows: z.number().int(),
  cols: z.number().int(),
  description: z.string().optional(),
});

// Types
export type PlatformCommand = z.infer<typeof PlatformCommandSchema>;
export type TerminalCell = z.infer<typeof TerminalCellSchema>;
export type GridLayout = z.infer<typeof GridLayoutSchema>;
export type MergedCell = z.infer<typeof MergedCellSchema>;
export type TermGridConfig = z.infer<typeof TermGridConfigSchema>;
export type LayoutPreset = z.infer<typeof LayoutPresetSchema>;
