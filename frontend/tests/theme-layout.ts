import type { Locator, Page } from "@playwright/test";

import { expect } from "./fixtures";

export async function expectWorkspaceAtViewportEdges(page: Page, fullWidthHeader = true): Promise<void> {
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  const geometry = await page.getByRole("banner").evaluate((header) => {
    const shell = header.parentElement;
    if (!shell) throw new Error("The visible application header must belong to a workspace");
    const style = getComputedStyle(shell);
    const headerBounds = header.getBoundingClientRect();
    const shellBounds = shell.getBoundingClientRect();
    return {
      header: { x: headerBounds.x, y: headerBounds.y, width: headerBounds.width },
      shell: { x: shellBounds.x, y: shellBounds.y, right: shellBounds.right, bottom: shellBounds.bottom },
      radius: style.borderRadius,
      viewport: { width: innerWidth, height: innerHeight },
      noOverflow: document.documentElement.scrollWidth <= innerWidth,
    };
  });
  expect(geometry.shell.x).toBeCloseTo(0, 1);
  expect(geometry.shell.y).toBeCloseTo(0, 1);
  expect(geometry.shell.right).toBeCloseTo(geometry.viewport.width, 1);
  expect(geometry.radius, "The application must have square outer corners").toBe("0px");
  expect(geometry.noOverflow).toBe(true);
  if (geometry.viewport.width > 700) expect(geometry.shell.bottom).toBeCloseTo(geometry.viewport.height, 1);
  else expect(geometry.shell.bottom).toBeGreaterThanOrEqual(geometry.viewport.height);
  if (fullWidthHeader) {
    expect(geometry.header.x).toBeCloseTo(0, 1);
    expect(geometry.header.y).toBeCloseTo(0, 1);
    expect(geometry.header.width).toBeCloseTo(geometry.viewport.width, 1);
  }
}

export async function expectPreviewAtEdges(preview: Locator): Promise<void> {
  const geometry = await preview.evaluate((element) => {
    const frame = element.firstElementChild;
    if (!frame) throw new Error("A theme preview must render its miniature workspace");
    const outside = element.getBoundingClientRect();
    const inside = frame.getBoundingClientRect();
    return {
      gaps: [inside.left - outside.left, inside.top - outside.top, outside.right - inside.right, outside.bottom - inside.bottom],
      frameRadius: getComputedStyle(frame).borderRadius,
      previewRadius: getComputedStyle(element).borderRadius,
    };
  });
  for (const gap of geometry.gaps) expect(gap, "The miniature workspace must touch every preview edge").toBeCloseTo(0, 1);
  expect(geometry.frameRadius).toBe("0px");
  expect(geometry.previewRadius).toBe("0px");
}
