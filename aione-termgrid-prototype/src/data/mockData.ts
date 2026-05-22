import type { ConfigFile, TermGridConfig } from '../types';

export const mockConfigFiles: ConfigFile[] = [
  {
    id: '1',
    name: 'backend-services.tg',
    path: '.term-grid/backend-services.tg',
    status: 'saved',
    lastModified: '2026-05-22 10:30',
  },
  {
    id: '2',
    name: 'frontend-dev.tg',
    path: '.term-grid/frontend-dev.tg',
    status: 'saved',
    lastModified: '2026-05-21 16:45',
  },
  {
    id: '3',
    name: 'database-cluster.tg',
    path: '.term-grid/database-cluster.tg',
    status: 'saved',
    lastModified: '2026-05-20 09:15',
  },
  {
    id: '4',
    name: 'monitoring.tg',
    path: '.term-grid/monitoring.tg',
    status: 'saved',
    lastModified: '2026-05-19 14:20',
  },
];

export const mockGridConfig: TermGridConfig = {
  id: 'backend-services',
  name: 'backend-services.tg',
  layout: { rows: 2, cols: 2 },
  cells: [
    {
      id: 'cell-1',
      title: 'API Server',
      status: 'running',
      borderColor: '#22c55e',
      cwd: '/projects/api',
      command: {
        default: 'npm run dev',
        win32: 'npm run dev:win',
      },
      order: 1,
      delay: 0,
    },
    {
      id: 'cell-2',
      title: 'WebSocket',
      status: 'running',
      borderColor: '#3b82f6',
      cwd: '/projects/ws',
      command: { default: 'npm run ws' },
      order: 2,
      delay: 2,
    },
    {
      id: 'cell-3',
      title: 'Redis Cache',
      status: 'stopped',
      borderColor: '#f59e0b',
      cwd: '/projects/cache',
      command: { default: 'redis-server' },
      order: 3,
      delay: 1,
    },
    {
      id: 'cell-4',
      title: 'Queue Worker',
      status: 'pending',
      borderColor: '#8b5cf6',
      cwd: '/projects/queue',
      command: { default: 'npm run worker' },
      order: 4,
      delay: 3,
    },
  ],
};
