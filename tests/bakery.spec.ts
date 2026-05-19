/* eslint-disable react-hooks/rules-of-hooks */
import { expect, test as base } from '@playwright/test';

const internalNavTargets = ['#home', '#categories', '#fresh', '#visit'];
const importantSections = ['.cinematic-intro', '#home', '#categories', '#fresh', '.about-section', '#visit'];

const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    page.on('requestfailed', (request) => {
      const url = request.url();

      if (url.startsWith('http://127.0.0.1:5174/')) {
        errors.push(`${request.failure()?.errorText ?? 'request failed'}: ${url}`);
      }
    });

    await use(errors);

    expect(errors, 'No obvious JavaScript console, page, or local resource errors').toEqual([]);
  },
});

test.describe('Bakery website', () => {
  test('homepage, hero, intro canvas, and core sections load', async ({ page, consoleErrors }) => {
    void consoleErrors;

    await page.goto('/');
    await expect(page).toHaveTitle(/Bakery 2\.0/);
    await expect(page.locator('main.site-shell')).toBeVisible();
    await expect(page.locator('.cinematic-intro')).toBeVisible();
    await expect(page.locator('.cinematic-intro__canvas')).toBeVisible();
    await expect(page.locator('#home')).toBeAttached();

    await expect
      .poll(() =>
        page.locator('.cinematic-intro__canvas').evaluate((canvas) => {
          const element = canvas as HTMLCanvasElement;
          return element.width > 0 && element.height > 0;
        }),
      )
      .toBe(true);

    for (const selector of importantSections) {
      const section = page.locator(selector).first();
      await expect(section).toBeAttached();
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
    }
  });

  test('page scrolls from top to bottom and the intro does not freeze completely', async ({
    page,
    consoleErrors,
  }, testInfo) => {
    void consoleErrors;

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);

    await page.evaluate(() => {
      const probeWindow = window as typeof window & {
        __bakeryScrollProbe?: {
          done: boolean;
          frameGaps: number[];
          maxFrameGap: number;
          maxIntroProgress: number;
          maxScrollY: number;
          sampleCount: number;
        };
      };
      const section = document.querySelector<HTMLElement>('.cinematic-intro');

      probeWindow.__bakeryScrollProbe = {
        done: false,
        frameGaps: [],
        maxFrameGap: 0,
        maxIntroProgress: 0,
        maxScrollY: window.scrollY,
        sampleCount: 0,
      };

      let lastFrame = performance.now();
      const start = lastFrame;
      const duration = 4200;

      const readIntroProgress = () =>
        Number.parseFloat(section?.style.getPropertyValue('--intro-progress') || '0') || 0;

      const sample = (now: number) => {
        const probe = probeWindow.__bakeryScrollProbe;

        if (!probe) {
          return;
        }

        const frameGap = now - lastFrame;
        probe.sampleCount += 1;
        probe.frameGaps.push(frameGap);
        probe.maxFrameGap = Math.max(probe.maxFrameGap, frameGap);
        probe.maxIntroProgress = Math.max(probe.maxIntroProgress, readIntroProgress());
        probe.maxScrollY = Math.max(probe.maxScrollY, window.scrollY);
        lastFrame = now;

        if (now - start < duration) {
          requestAnimationFrame(sample);
          return;
        }

        probe.done = true;
      };

      requestAnimationFrame(sample);
    });

    const viewport = page.viewportSize();
    const wheelDelta = testInfo.project.name.includes('mobile') ? 280 : 360;

    if (viewport) {
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
    }

    for (let index = 0; index < 30; index += 1) {
      await page.mouse.wheel(0, wheelDelta);
      await page.waitForTimeout(70);
    }

    await page.waitForFunction(() => {
      const probeWindow = window as typeof window & {
        __bakeryScrollProbe?: { done: boolean };
      };

      return probeWindow.__bakeryScrollProbe?.done === true;
    });

    const scrollMetrics = await page.evaluate(() => {
      const probeWindow = window as typeof window & {
        __bakeryScrollProbe?: {
          done: boolean;
          frameGaps: number[];
          maxFrameGap: number;
          maxIntroProgress: number;
          maxScrollY: number;
          sampleCount: number;
        };
      };
      const fullHeight = document.documentElement.scrollHeight;
      const maxPossibleScrollY = fullHeight - window.innerHeight;
      const probe = probeWindow.__bakeryScrollProbe;
      const frameGaps = probe?.frameGaps ?? [];
      const sortedFrameGaps = [...frameGaps].sort((a, b) => a - b);

      return {
        ...(probe ?? {
          frameGaps: [],
          maxFrameGap: 0,
          maxIntroProgress: 0,
          maxScrollY: 0,
          sampleCount: 0,
        }),
        p95FrameGap: sortedFrameGaps[Math.floor(sortedFrameGaps.length * 0.95)] ?? 0,
        finalScrollY: window.scrollY,
        fullHeight,
        maxPossibleScrollY,
      };
    });

    for (let index = 0; index < 30; index += 1) {
      const isNearBottom = await page.evaluate(() => {
        const maxPossibleScrollY = document.documentElement.scrollHeight - window.innerHeight;
        return window.scrollY >= maxPossibleScrollY - 140;
      });

      if (isNearBottom) {
        break;
      }

      await page.mouse.wheel(0, wheelDelta);
      await page.waitForTimeout(35);
    }

    const bottomMetrics = await page.evaluate(() => {
      const maxPossibleScrollY = document.documentElement.scrollHeight - window.innerHeight;

      return {
        scrollY: window.scrollY,
        maxPossibleScrollY,
      };
    });

    expect(scrollMetrics.sampleCount).toBeGreaterThan(20);
    expect(scrollMetrics.p95FrameGap).toBeLessThan(250);
    expect(scrollMetrics.maxScrollY).toBeGreaterThan(1000);
    expect(scrollMetrics.maxIntroProgress).toBeGreaterThan(0.2);
    expect(scrollMetrics.fullHeight).toBeGreaterThan(2000);
    expect(bottomMetrics.scrollY).toBeGreaterThanOrEqual(bottomMetrics.maxPossibleScrollY - 140);
    await expect(page.locator('#visit')).toBeInViewport({ ratio: 0.1 });
  });

  test('desktop navigation links target real sections', async ({ page, consoleErrors }, testInfo) => {
    void consoleErrors;

    test.skip(testInfo.project.name.includes('mobile'), 'Desktop navigation is checked in the desktop viewport.');

    await page.goto('/');
    await page.locator('.cinematic-intro__skip').click();

    for (const href of internalNavTargets) {
      const link = page.locator(`.desktop-nav a[href="${href}"]`);
      await expect(link).toBeVisible();
      await link.click();
      await expect(page.locator(href)).toBeInViewport({ ratio: 0.1 });
    }
  });

  test('viewport-specific intro media loads', async ({ page, consoleErrors }, testInfo) => {
    void consoleErrors;

    await page.goto('/');
    await expect(page.locator('.cinematic-intro__canvas')).toBeVisible();

    const metrics = await page.locator('.cinematic-intro__canvas').evaluate((canvas) => {
      const element = canvas as HTMLCanvasElement;
      const rect = element.getBoundingClientRect();

      return {
        cssWidth: Math.round(rect.width),
        cssHeight: Math.round(rect.height),
        pixelWidth: element.width,
        pixelHeight: element.height,
      };
    });

    if (testInfo.project.name.includes('mobile')) {
      expect(metrics.cssWidth).toBeLessThanOrEqual(430);
      expect(metrics.cssHeight).toBeGreaterThanOrEqual(700);
      return;
    }

    expect(metrics.cssWidth).toBeGreaterThanOrEqual(1000);
    expect(metrics.cssHeight).toBeGreaterThanOrEqual(700);
  });
});
