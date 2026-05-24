import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? process.env.VITE_PORT ?? 5175);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const localChromeExecutable = [
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]
  .filter(Boolean)
  .find((candidate) => existsSync(candidate as string));
const localLaunchOptions = !process.env.CI && localChromeExecutable ? { executablePath: localChromeExecutable } : undefined;
const localFfmpegExecutable = [
  process.env.PLAYWRIGHT_FFMPEG_EXECUTABLE,
  'C:\\Users\\openb\\AppData\\Local\\ms-playwright\\ffmpeg-1011\\ffmpeg-win64.exe',
]
  .filter(Boolean)
  .find((candidate) => existsSync(candidate as string));
const videoMode = process.env.CI || localFfmpegExecutable ? 'retain-on-failure' : 'off';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: videoMode,
    launchOptions: localLaunchOptions,
  },
  projects: [
    {
      name: 'desktop-1440',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-iphone-style',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
  },
});
