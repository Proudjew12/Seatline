import { readFile } from "node:fs/promises";

import type { Page, TestInfo } from "@playwright/test";

import { closeSettings, expect, openSettings, setEditMode, test } from "./fixtures";
import { expectPreviewAtEdges, expectWorkspaceAtViewportEdges } from "./theme-layout";

const originalThemes = ["Default", "Studio", "Midnight", "Dune", "Forest", "Plum"];
const artworkThemes = [
  { id: "aurora", name: "Aurora", hebrew: "זוהר הקוטב", appearance: "light" },
  { id: "solstice", name: "Solstice", hebrew: "שקיעה", appearance: "light" },
  { id: "orbit", name: "Orbit", hebrew: "מסלול", appearance: "dark" },
  { id: "harbor", name: "Harbor", hebrew: "נמל", appearance: "dark" },
  { id: "meadow", name: "Meadow", hebrew: "אחו", appearance: "light" },
  { id: "alpine", name: "Alpine", hebrew: "אלפיני", appearance: "dark" },
  { id: "aurora-rose", name: "Aurora Rose", hebrew: "זוהר ורוד", appearance: "light" },
  { id: "aurora-mint", name: "Aurora Mint", hebrew: "זוהר מנטה", appearance: "light" },
  { id: "aurora-ice", name: "Aurora Ice", hebrew: "זוהר קרח", appearance: "light" },
  { id: "aurora-peach", name: "Aurora Peach", hebrew: "זוהר אפרסק", appearance: "light" },
  { id: "aurora-dusk", name: "Aurora Dusk", hebrew: "זוהר דמדומים", appearance: "dark" },
  { id: "aurora-ocean", name: "Aurora Ocean", hebrew: "זוהר אוקיינוס", appearance: "dark" },
] as const;

function backgroundUrl(background: string): string {
  const url = background.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
  expect(url, "Artwork must be painted as a real background image").toBeTruthy();
  return url ?? "";
}

async function workspaceArtwork(page: Page): Promise<string> {
  return page.getByRole("main").evaluate((main) => {
    let element: Element | null = main;
    while (element) {
      const background = getComputedStyle(element).backgroundImage;
      if (background.includes("url(")) return background;
      element = element.parentElement;
    }
    return "none";
  });
}

async function downloadPdf(page: Page, testInfo: TestInfo, name: string): Promise<Buffer> {
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const download = await downloading;
  expect(await download.failure()).toBeNull();
  const path = testInfo.outputPath(`${name}.pdf`);
  await download.saveAs(path);
  const pdf = await readFile(path);
  expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(pdf.subarray(-1024).toString("ascii")).toContain("%%EOF");
  expect(pdf.toString("latin1")).toMatch(/\/Author\s*\(Logi\)/);
  return pdf;
}

for (const theme of artworkThemes) {
  test(`${theme.name} loads matching preview artwork, preserves a printable quote, and persists in narrow Hebrew`, async ({ page }, testInfo) => {
    const imageResponses = new Map<string, number>();
    page.on("response", (response) => {
      if (response.request().resourceType() === "image") imageResponses.set(response.url(), response.status());
    });
    await page.goto("/");
    await page.getByLabel("Customer", { exact: true }).fill("Artwork theme customer");
    await page.getByLabel("Sales Proposal", { exact: true }).fill(`ART-${theme.id}`);
    await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
    const line = page.getByRole("group", { name: "Business Basic", exact: true });
    await line.getByLabel("Quantity", { exact: true }).fill("2");
    await line.getByRole("textbox", { name: "Price", exact: true }).fill("25");
    await line.getByRole("textbox", { name: "Profit rate", exact: true }).fill("17");
    await page.getByRole("textbox", { name: "Notes", exact: true }).fill("Keep customer details and print styling across artwork themes.");
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$58.50");
    const originalPdf = await downloadPdf(page, testInfo, `${theme.id}-default-quote`);

    await openSettings(page);
    const settings = page.getByRole("dialog", { name: "Settings", exact: true });
    await settings.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
    await settings.getByRole("button", { name: "Browse themes", exact: true }).click();
    const gallery = page.getByRole("dialog", { name: "Choose your theme", exact: true });
    for (const name of [...originalThemes, ...artworkThemes.map((item) => item.name)]) {
      await expect(gallery.getByRole("button", { name, exact: true })).toBeVisible();
    }
    const choice = gallery.getByRole("button", { name: theme.name, exact: true });
    await choice.scrollIntoViewIfNeeded();
    const preview = choice.locator("[data-theme]");
    await expectPreviewAtEdges(preview);
    await expect(preview).toHaveCSS("color-scheme", theme.appearance);
    const artworkUrl = backgroundUrl(await preview.evaluate((element) => getComputedStyle(element).backgroundImage));
    expect(new URL(artworkUrl).origin).toBe(new URL(page.url()).origin);
    await expect.poll(() => imageResponses.get(artworkUrl)).toBe(200);
    const dimensions = await preview.evaluate(async (element) => {
      const source = getComputedStyle(element).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (!source) throw new Error("The theme preview has no image source");
      const image = new Image();
      image.src = source;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    });
    expect(dimensions.width).toBeGreaterThan(100);
    expect(dimensions.height).toBeGreaterThan(100);
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(gallery).toBeVisible();
    // Existing previews must clear the artwork inherited from the newly selected page theme.
    for (const name of originalThemes) {
      const originalPreview = gallery.getByRole("button", { name, exact: true }).locator("[data-theme]");
      await expect(originalPreview).toHaveCSS("background-image", "none");
      expect(await originalPreview.evaluate((element) => getComputedStyle(element).getPropertyValue("--theme-background-image").trim())).toBe("none");
    }
    if (testInfo.project.name === "desktop" && ["solstice", "meadow", "aurora-mint", "aurora-dusk"].includes(theme.id)) {
      await page.mouse.move(10, 10);
      await page.screenshot({ path: testInfo.outputPath(`${theme.id}-gallery-row-english.png`) });
    }
    await gallery.getByRole("button", { name: "Done", exact: true }).click();
    await expect(settings.getByRole("button", { name: "Browse themes", exact: true })).toBeFocused();
    await expect(settings.getByText(theme.name, { exact: true })).toBeVisible();
    await expect(settings.getByRole("combobox", { name: "Appearance", exact: true })).toHaveCount(0);
    await closeSettings(page);
    await expect(page.locator("html")).toHaveCSS("color-scheme", theme.appearance);
    await expectWorkspaceAtViewportEdges(page);
    expect(backgroundUrl(await workspaceArtwork(page))).toBe(artworkUrl);
    const quoteSurfaceAlpha = await page.getByRole("main").evaluate((element) => {
      const color = getComputedStyle(element).backgroundColor;
      return Number(color.match(/^rgba\([^)]*,\s*([\d.]+)\)$/)?.[1] ?? "1");
    });
    expect(quoteSurfaceAlpha, "The quote surface must let the surrounding artwork show through").toBeLessThan(1);
    await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Artwork theme customer");
    await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("25");
    await expect(line.getByRole("textbox", { name: "Profit rate", exact: true })).toHaveValue("17");
    await expect(page.getByLabel("Business Basic profit per license", { exact: true })).toHaveText("$4.25");
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$58.50");
    const themedPdf = await downloadPdf(page, testInfo, `${theme.id}-artwork-quote`);
    const embeddedImages = (pdf: Buffer) => [...pdf.toString("latin1").matchAll(/\/Subtype\s*\/Image\b/g)].length;
    expect(embeddedImages(originalPdf)).toBeGreaterThan(0);
    expect(embeddedImages(themedPdf), "Screen artwork must not become a PDF background").toBe(embeddedImages(originalPdf));
    if (testInfo.project.name === "desktop") {
      await page.mouse.move(10, 10);
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
      await page.screenshot({ path: testInfo.outputPath(`${theme.id}-workspace-desktop.png`), fullPage: true });
    }
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme.id);
    expect(backgroundUrl(await workspaceArtwork(page))).toBe(artworkUrl);
    await expect(page.getByLabel("Sales Proposal", { exact: true })).toHaveValue(`ART-${theme.id}`);
    await expect(page.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue("Keep customer details and print styling across artwork themes.");

    await page.setViewportSize({ width: 320, height: 700 });
    await openSettings(page);
    await settings.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
    await settings.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
    await page.getByRole("button", { name: "עיון בערכות נושא", exact: true }).click();
    const hebrewGallery = page.getByRole("dialog", { name: "בחירת ערכת נושא", exact: true });
    const hebrewChoice = hebrewGallery.getByRole("button", { name: theme.hebrew, exact: true });
    await expect(hebrewChoice).toHaveAttribute("aria-pressed", "true");
    await hebrewChoice.scrollIntoViewIfNeeded();
    await expect(hebrewChoice).toBeInViewport();
    await expectPreviewAtEdges(hebrewChoice.locator("[data-theme]"));
    expect(await hebrewGallery.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight;
    })).toBe(true);
    await expect(hebrewChoice.getByText(theme.hebrew, { exact: true })).toBeVisible();
    expect(backgroundUrl(await hebrewChoice.locator("[data-theme]").evaluate((element) => getComputedStyle(element).backgroundImage))).toBe(artworkUrl);
    await page.screenshot({ path: testInfo.outputPath(`${theme.id}-gallery-hebrew-320.png`) });
    await hebrewGallery.getByRole("button", { name: "סיום", exact: true }).click();
    await closeSettings(page);
    await expectWorkspaceAtViewportEdges(page);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ["תשלומים חודשיים", "תשלומים שנתיים", "לתשלום בתחילת התקופה"]) {
      expect(await page.getByLabel(name, { exact: true }).evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return new Set(Array.from(range.getClientRects(), (rectangle) => Math.round(rectangle.top))).size;
      }), `${name} must keep the monetary amount on one line`).toBe(1);
    }
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`${theme.id}-workspace-hebrew-320.png`), fullPage: true });
    await line.getByLabel("כמות", { exact: true }).fill("9999");
    await line.getByRole("textbox", { name: "מחיר", exact: true }).fill("1000000");
    await line.getByRole("textbox", { name: "שיעור רווח", exact: true }).fill("100");
    await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$19,998,000,000.00");
    await expect(page.getByLabel("אומדן ל־12 חודשים", { exact: true })).toHaveText("$239,976,000,000.00");
    await expect(page.getByRole("button", { name: "ייצוא PDF", exact: true })).toBeEnabled();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ["תשלומים חודשיים", "תשלומים שנתיים", "לתשלום בתחילת התקופה", "אומדן ל־12 חודשים"]) {
      expect(await page.getByLabel(name, { exact: true }).evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        return bounds.left >= 0 && bounds.right <= innerWidth
          && Array.from(range.getClientRects()).every((rectangle) => rectangle.left >= 0 && rectangle.right <= innerWidth);
      }), `${name} must contain every digit of a maximum valid total inside the viewport`).toBe(true);
      if (name !== "אומדן ל־12 חודשים") {
        expect(await page.getByLabel(name, { exact: true }).evaluate((element) => {
          const label = element.previousElementSibling;
          if (!label) throw new Error("A summary amount must have a visible label");
          const amountRange = document.createRange();
          amountRange.selectNodeContents(element);
          const labelRange = document.createRange();
          labelRange.selectNodeContents(label);
          const labels = Array.from(labelRange.getClientRects());
          return Array.from(amountRange.getClientRects()).every((amount) => labels.every((text) =>
            amount.right <= text.left || amount.left >= text.right || amount.bottom <= text.top || amount.top >= text.bottom));
        }), `${name} must not overlap its amount at the maximum valid price and quantity`).toBe(true);
      }
    }
    await page.getByRole("main").locator("footer").screenshot({ path: testInfo.outputPath(`${theme.id}-maximum-totals-hebrew-320.png`) });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme.id);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await openSettings(page);
    const hebrewSettings = page.getByRole("dialog", { name: "הגדרות", exact: true });
    await expect(hebrewSettings.getByText(theme.hebrew, { exact: true })).toBeVisible();
    await expect(hebrewSettings.getByRole("combobox", { name: "גודל טקסט", exact: true })).toHaveValue("150");
    await expect(hebrewSettings.getByRole("combobox", { name: "מראה", exact: true })).toHaveCount(0);
    await hebrewSettings.getByRole("button", { name: "עיון בערכות נושא", exact: true }).click();
    await hebrewGallery.getByRole("button", { name: "ברירת מחדל", exact: true }).click();
    await hebrewGallery.getByRole("button", { name: "סיום", exact: true }).click();
    await expect(hebrewSettings.getByRole("combobox", { name: "מראה", exact: true })).toHaveValue("dark");
    await closeSettings(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await workspaceArtwork(page), "Returning to Default must remove the workspace artwork").toBe("none");
  });
}

for (const theme of artworkThemes.filter((item) => ["orbit", "aurora", "aurora-ocean"].includes(item.id))) {
  test(`${theme.name} adds once per pointer drag in Normal Mode and blocks dragging in Edit Mode`, async ({ page, context, hasTouch }) => {
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.goto("/");
    await openSettings(page);
    await page.getByRole("button", { name: "Browse themes", exact: true }).click();
    const gallery = page.getByRole("dialog", { name: "Choose your theme", exact: true });
    await gallery.getByRole("button", { name: theme.name, exact: true }).click();
    await gallery.getByRole("button", { name: "Done", exact: true }).click();
    await closeSettings(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme.id);
    await expectWorkspaceAtViewportEdges(page);
    const card = page.getByRole("button", { name: "Add Business Basic to quote", exact: true });
    const target = page.getByRole("region", { name: "Quote items", exact: true });
    for (const editing of [false, true, false]) {
      await setEditMode(page, editing);
      const sourceBox = await card.boundingBox();
      const targetBox = await target.boundingBox();
      if (!sourceBox || !targetBox) throw new Error("The catalog and quote must be visible for dragging.");
      const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
      const end = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };
      if (hasTouch) {
        const session = await context.newCDPSession(page);
        try {
          await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1 }] });
          for (let step = 1; step <= 20; step += 1) {
            await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
              x: start.x + (end.x - start.x) * step / 20,
              y: start.y + (end.y - start.y) * step / 20, id: 1,
            }] });
          }
          await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        } finally { await session.detach(); }
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(end.x, end.y, { steps: 20 });
        await page.mouse.up();
      }
      await expect(page.getByTestId("quote-line")).toHaveCount(editing ? 0 : 1);
      if (!editing) {
        await expect(page.getByRole("group", { name: "Business Basic", exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Remove Business Basic", exact: true }).click();
      }
      await expect(page.getByRole("button", { name: "Edit Business Basic", exact: true })).toHaveCount(editing ? 1 : 0);
    }
  });
}
