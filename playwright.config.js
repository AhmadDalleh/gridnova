import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Edge is optional: only add the project when msedge is actually installed, otherwise skip silently.
const edgePaths = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/opt/microsoft/msedge/msedge',
];
const hasEdge = edgePaths.some((p) => existsSync(p));

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    ...(hasEdge ? [{ name: 'msedge', use: { channel: 'msedge' } }] : []),
  ],
});
