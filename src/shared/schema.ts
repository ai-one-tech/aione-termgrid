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
  borderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  cwd: z.string(),
  command: PlatformCommandSchema,
  env: z.record(z.string()).optional(),
  order: z.number().int().min(1).max(99).default(1),
  delay: z.number().int().min(0).max(300).default(0),
  colSpan: z.number().int().min(1).optional(),
  rowSpan: z.number().int().min(1).optional(),
});

// Grid layout configuration
export const GridLayoutSchema = z.object({
  rows: z.number().int().min(1).max(4),
  cols: z.number().int().min(1).max(4),
});

// Merged cell definition
export const MergedCellSchema = z.object({
  start: z.tuple([z.number(), z.number()]),
  end: z.tuple([z.number(), z.number()]),
});

// Main configuration schema
export const TermGridConfigSchema = z.object({
  name: z.string().min(1).max(100),
  layout: GridLayoutSchema,
  cells: z.array(TerminalCellSchema).min(1).max(16),
  mergedCells: z.array(MergedCellSchema).optional().default([]),
  theme: z.enum(['dark', 'light']).optional().default('dark'),
  language: z.string().optional().default('en'),
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
