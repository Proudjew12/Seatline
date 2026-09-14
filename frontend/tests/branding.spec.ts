import type { Locator } from "@playwright/test";

import { closeSettings, expect, openSettings, test } from "./fixtures";

const palettes = [
  { group: "Default", names: ["Default", "Default dark"] },
  { group: "color themes", names: ["Studio", "Midnight", "Dune", "Forest", "Plum"] },
  { group: "background themes", names: ["Aurora", "Solstice", "Orbit", "Harbor", "Meadow", "Alpine"] },
  { group: "Aurora variants", names: ["Aurora Rose", "Aurora Mint", "Aurora Ice", "Aurora Peach", "Aurora Dusk", "Aurora Ocean"] },
];

async function expectProportions(artwork: Locator, ratio: number): Promise<void> {
  await expect(artwork).toBeVisible();
  const geometry = await artwork.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, ratio: box.width / box.height, transform: getComputedStyle(element).transform };
  });
  expect(geometry.width).toBeGreaterThan(20);
  expect(geometry.ratio).toBeCloseTo(ratio, 2);
  expect(geometry.transform).toBe("none");
}

async function expectArtworkLoaded(masks: Locator): Promise<void> {
  const artwork = await masks.evaluateAll(async (elements) => Promise.all(elements.map(async (element) => {
    const path = /^url\(["']?(.*?)["']?\)$/.exec(getComputedStyle(element).maskImage)?.[1];
    if (!path) throw new Error("Brand artwork must have an image mask");
    const url = new URL(path, location.href);
    const image = new Image();
    image.src = url.href;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Artwork measurement is unavailable");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return {
      local: url.origin === location.origin,
      visiblePixels: pixels.filter((value, index) => index % 4 === 3 && value > 0).length,
    };
  })));
  expect(artwork.length).toBeGreaterThan(0);
  for (const item of artwork) {
    expect(item.local).toBe(true);
    expect(item.visiblePixels).toBeGreaterThan(100);
  }
}

async function artworkContrast(mask: Locator): Promise<number> {
  return mask.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Color measurement is unavailable");
    const luminance = () => {
      const linear = Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3), (value) => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    context.fillStyle = getComputedStyle(element).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const foreground = luminance();
    const layers: string[] = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.backgroundImage !== "none") break;
      layers.unshift(style.backgroundColor);
    }
    return Math.min(...["#000", "#fff"].map((base) => {
      context.fillStyle = base;
      context.fillRect(0, 0, 1, 1);
      for (const layer of layers) {
        context.fillStyle = layer;
        context.fillRect(0, 0, 1, 1);
      }
      const background = luminance();
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    }));
  });
}

for (const palette of palettes) {
  test(`keeps the original branding legible and proportional in ${palette.group}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Theme artwork is checked once in desktop Chromium.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle("Seatline");
    const banner = page.getByRole("banner");
    const wordmark = banner.getByRole("img", { name: "Seatline", exact: true });
    const mark = page.getByRole("main").locator('[style*="seatline-mark.svg"]');
    await expect(wordmark).toBeVisible();
    await expectArtworkLoaded(page.locator('[style*="mask-image"][style*="branding/seatline-"]'));
    await page.getByLabel("Customer", { exact: true }).fill("Branding customer");
    for (const name of palette.names) {
      await openSettings(page);
      await page.getByRole("button", { name: "Browse themes", exact: true }).click();
      const gallery = page.getByRole("dialog", { name: "Choose your theme", exact: true });
      const preview = gallery.locator('[role="img"][aria-label="Seatline"]');
      await expect(preview).toHaveCount(18);
      if (name === "Default") {
        for (const item of await preview.all()) {
          await expectProportions(item, 667.86 / 142.74);
          expect((await item.boundingBox())?.width).toBeLessThan(60);
        }
        await page.screenshot({ path: testInfo.outputPath("branding-theme-gallery.png") });
      }
      await gallery.getByRole("button", { name: name === "Default dark" ? "Default" : name, exact: true }).click();
      await gallery.getByRole("button", { name: "Done", exact: true }).click();
      if (name === "Default dark") await page.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
      await closeSettings(page);
      await expectProportions(wordmark, 667.86 / 142.74);
      await expectProportions(mark, 367.92 / 246.399);
      await expect(mark).toHaveAttribute("aria-hidden", "true");
      await expect(wordmark).toHaveCSS("direction", "ltr");
      await expect(banner.getByRole("img")).toHaveCount(1);
      await expect(banner.locator('[style*="seatline-mark.svg"]')).toHaveCount(0);
      for (const mask of [...await wordmark.locator("span").all(), mark]) {
        expect(await artworkContrast(mask), `${name}: brand artwork must contrast with its surface`).toBeGreaterThanOrEqual(3);
      }
      expect((await banner.boundingBox())?.height).toBe(56);
      await expect(page.getByText("Drag a license card here to add it", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Branding customer");
      await page.screenshot({ path: testInfo.outputPath(`branding-${name.toLowerCase().replaceAll(" ", "-")}.png`) });
    }
    await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
    const line = page.getByRole("group", { name: "Business Basic", exact: true });
    await line.getByRole("textbox", { name: "Price", exact: true }).fill("25");
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$25.00");
    await expect(mark).toHaveCount(0);
    await page.getByRole("button", { name: "Remove Business Basic", exact: true }).click();
    await expectProportions(mark, 367.92 / 246.399);
  });
}

test("keeps the wordmark unmirrored and quoting usable in Hebrew at 320px and 150%", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "This scenario sets its own narrow viewport.");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await openSettings(page);
  await page.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
  await page.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
  await closeSettings(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const banner = page.getByRole("banner");
  const wordmark = banner.getByRole("img", { name: "Seatline", exact: true });
  await expectProportions(wordmark, 667.86 / 142.74);
  await expect(wordmark).toHaveCSS("direction", "ltr");
  const brandBox = await wordmark.boundingBox();
  const gearBox = await banner.getByRole("button", { name: "הגדרות", exact: true }).boundingBox();
  if (!brandBox || !gearBox) throw new Error("The brand and settings must be visible");
  expect(brandBox.x).toBeGreaterThanOrEqual(0);
  expect(brandBox.x + brandBox.width).toBeLessThan(gearBox.x);
  expect(gearBox.x + gearBox.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath("branding-hebrew-header-320-150.png") });
  const mark = page.getByRole("main").locator('[style*="seatline-mark.svg"]');
  await mark.scrollIntoViewIfNeeded();
  await expectProportions(mark, 367.92 / 246.399);
  await page.screenshot({ path: testInfo.outputPath("branding-hebrew-empty-320-150.png") });
  await page.getByLabel("לקוח", { exact: true }).fill("לקוח בדיקה");
  await page.getByRole("button", { name: "הוספת Business Basic להצעה", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByLabel("כמות", { exact: true }).fill("2");
  await line.getByRole("textbox", { name: "מחיר", exact: true }).fill("25");
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$50.00");
  await expect(page.getByRole("button", { name: "ייצוא PDF", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$50.00");
  await expectProportions(wordmark, 667.86 / 142.74);
});
