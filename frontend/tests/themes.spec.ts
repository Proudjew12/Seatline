import { readFile } from "node:fs/promises";

import type { Locator, Page } from "@playwright/test";

import { closeSettings, expect, openSettings, test } from "./fixtures";
import { expectPreviewAtEdges, expectWorkspaceAtViewportEdges } from "./theme-layout";

const themeNames = [
  "Default", "Studio", "Midnight", "Dune", "Forest", "Plum", "Aurora", "Solstice", "Orbit", "Harbor", "Meadow", "Alpine",
  "Aurora Rose", "Aurora Mint", "Aurora Ice", "Aurora Peach", "Aurora Dusk", "Aurora Ocean",
];
const themeGroups = [
  { name: "Default", hebrew: "ברירת מחדל", themes: themeNames.slice(0, 1) },
  { name: "Color themes", hebrew: "ערכות צבע", themes: themeNames.slice(1, 6) },
  { name: "Background themes", hebrew: "ערכות עם רקע", themes: themeNames.slice(6) },
];

async function openThemeGallery(page: Page): Promise<Locator> {
  await openSettings(page);
  await page.getByRole("button", { name: /^(Browse themes|עיון בערכות נושא)$/ }).click();
  const gallery = page.getByRole("dialog", { name: /^(Choose your theme|בחירת ערכת נושא)$/ });
  await expect(gallery).toBeVisible();
  return gallery;
}

async function finishThemeSelection(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^(Done|סיום)$/ }).click();
  await expect(page.getByRole("dialog", { name: /^(Choose your theme|בחירת ערכת נושא)$/ })).toHaveCount(0);
}

async function prepareQuote(page: Page): Promise<Locator> {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("Theme preview customer");
  await page.getByLabel("Sales Proposal", { exact: true }).fill("THEME-001");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("25");
  await line.getByRole("textbox", { name: "Profit rate", exact: true }).fill("17");
  return line;
}

async function visiblePalette(page: Page): Promise<string> {
  return page.getByRole("main").evaluate((element) => {
    const style = getComputedStyle(element);
    return `${style.backgroundColor}|${style.color}`;
  });
}

test("navigates the theme gallery by keyboard and restores the remembered Default appearance", async ({ page }, testInfo) => {
  await page.goto("/");
  const gear = page.getByRole("button", { name: "Settings", exact: true });
  await gear.focus();
  await page.keyboard.press("Enter");
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
  const browse = settings.getByRole("button", { name: "Browse themes", exact: true });
  await browse.focus();
  await page.keyboard.press("Enter");
  const gallery = page.getByRole("dialog", { name: "Choose your theme", exact: true });
  await expect(gallery).toBeVisible();
  for (const name of themeNames) await expect(gallery.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(gallery.locator("button[aria-pressed]")).toHaveCount(18);
  for (const group of themeGroups) {
    const section = gallery.getByRole("region", { name: group.name, exact: true });
    await expect(section.getByRole("heading", { name: group.name, exact: true })).toBeVisible();
    await expect(section.locator("button[aria-pressed]")).toHaveCount(group.themes.length);
    for (const name of group.themes) await expect(section.getByRole("button", { name, exact: true })).toBeVisible();
    if (testInfo.project.name === "desktop") {
      await section.getByRole("heading", { name: group.name, exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`gallery-group-${group.name.toLowerCase().replaceAll(" ", "-")}.png`) });
    }
  }
  await expect(gallery.getByRole("button", { name: "Default", exact: true })).toHaveAttribute("aria-pressed", "true");
  await gallery.getByRole("button", { name: "Default", exact: true }).focus();
  for (const name of themeNames.slice(1)) {
    await page.keyboard.press("Tab");
    await expect(gallery.getByRole("button", { name, exact: true })).toBeFocused();
    await expect(gallery.getByRole("button", { name, exact: true })).toBeInViewport();
  }
  await page.keyboard.press("Enter");
  await expect(gallery.getByRole("button", { name: "Aurora Ocean", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "aurora-ocean");
  await page.keyboard.press("Tab");
  await expect(gallery.getByRole("button", { name: "Done", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(gallery.getByRole("button", { name: "Aurora Ocean", exact: true })).toBeFocused();
  await gallery.getByRole("button", { name: "Studio", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(gallery.getByRole("button", { name: "Studio", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(gallery.locator('button[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "studio");
  await page.keyboard.press("Escape");
  await expect(gallery).toHaveCount(0);
  await expect(settings).toBeVisible();
  await expect(browse).toBeFocused();
  await expect(settings.getByRole("combobox", { name: "Appearance", exact: true })).toHaveCount(0);
  await expect(settings.getByText("Studio", { exact: true })).toBeVisible();
  await browse.press("Enter");
  await gallery.getByRole("button", { name: "Default", exact: true }).press("Enter");
  await expect(gallery).toBeVisible();
  await expect(gallery.getByRole("button", { name: "Default", exact: true })).toHaveAttribute("aria-pressed", "true");
  await finishThemeSelection(page);
  await expect(browse).toBeFocused();
  await expect(settings.getByRole("combobox", { name: "Appearance", exact: true })).toHaveValue("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.keyboard.press("Escape");
  await expect(settings).toHaveCount(0);
  await expect(gear).toBeFocused();
});

test("applies each custom theme without losing quote edits and remembers the selection after reload", async ({ page }, testInfo) => {
  const line = await prepareQuote(page);
  await line.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByRole("textbox", { name: "Notes", exact: true }).fill("Keep this note across themes.");
  const defaultPalette = await visiblePalette(page);
  await openSettings(page);
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
  await settings.getByRole("switch", { name: "Edit Mode", exact: true }).check();
  for (const name of themeNames.slice(1)) {
    const gallery = await openThemeGallery(page);
    await gallery.getByRole("button", { name, exact: true }).click();
    await expect(gallery).toBeVisible();
    await expect(gallery.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(gallery.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await finishThemeSelection(page);
    await expect(settings.getByText(name, { exact: true })).toBeVisible();
    await expect(settings.getByRole("switch", { name: "Edit Mode", exact: true })).toBeChecked();
    await expect(settings.getByRole("combobox", { name: "Text size", exact: true })).toHaveValue("150");
    await expect(settings.getByRole("combobox", { name: "Appearance", exact: true })).toHaveCount(0);
    await closeSettings(page);
    await expectWorkspaceAtViewportEdges(page);
    await expect.poll(() => visiblePalette(page)).not.toBe(defaultPalette);
    await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Theme preview customer");
    await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("25");
    await expect(line.getByRole("textbox", { name: "Profit rate", exact: true })).toHaveValue("17");
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$58.50");
    await expect(page.getByRole("button", { name: "Edit product", exact: true })).toBeVisible();
    if (testInfo.project.name === "desktop") {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      });
      await page.mouse.move(0, 0);
      await page.screenshot({ path: testInfo.outputPath(`quote-${name.toLowerCase().replaceAll(" ", "-")}.png`), fullPage: true });
    }
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "aurora-ocean");
  await expect(page.getByLabel("Sales Proposal", { exact: true })).toHaveValue("THEME-001");
  await expect(page.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue("Keep this note across themes.");
  await expect(line.getByLabel("Quantity", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$58.50");
  await openSettings(page);
  await expect(settings.getByText("Aurora Ocean", { exact: true })).toBeVisible();
  await expect(settings.getByRole("combobox", { name: "Text size", exact: true })).toHaveValue("150");
  await expect(settings.getByRole("switch", { name: "Edit Mode", exact: true })).not.toBeChecked();
  const gallery = await openThemeGallery(page);
  await expect(gallery.getByRole("button", { name: "Aurora Ocean", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("exports a customer PDF while a custom theme is selected", async ({ page }, testInfo) => {
  const line = await prepareQuote(page);
  const gallery = await openThemeGallery(page);
  await gallery.getByRole("button", { name: "Midnight", exact: true }).click();
  await gallery.getByRole("button", { name: "Close theme gallery", exact: true }).click();
  await expect(page.getByRole("button", { name: "Browse themes", exact: true })).toBeFocused();
  await closeSettings(page);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const download = await downloading;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toBe("Logi-THEME-001.pdf");
  const output = testInfo.outputPath("midnight-quote.pdf");
  await download.saveAs(output);
  const document = await readFile(output);
  expect(document.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(document.subarray(-1024).toString("ascii")).toContain("%%EOF");
  expect(document.toString("latin1")).toMatch(/\/Author\s*\(Logi\)/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("25");
  await expect(page.getByLabel("Business Basic profit per license", { exact: true })).toHaveText("$4.25");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("keeps the Hebrew theme gallery usable at 150% on a 320px screen", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await openSettings(page);
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
  await settings.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
  const gallery = await openThemeGallery(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(gallery).toHaveAccessibleName("בחירת ערכת נושא");
  for (const group of themeGroups) {
    const section = gallery.getByRole("region", { name: group.hebrew, exact: true });
    const heading = section.getByRole("heading", { name: group.hebrew, exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport();
    await expect(heading).toHaveCSS("direction", "rtl");
    await expect(section.locator("button[aria-pressed]")).toHaveCount(group.themes.length);
    await page.screenshot({ path: testInfo.outputPath(`gallery-group-${group.name.toLowerCase().replaceAll(" ", "-")}-hebrew-320.png`) });
  }
  await expect.poll(() => gallery.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.top >= 0 && bounds.bottom <= window.innerHeight;
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("gallery-hebrew-320.png") });
  for (const name of [
    "ברירת מחדל", "סטודיו", "חצות", "דיונה", "יער", "שזיף", "זוהר הקוטב", "שקיעה", "מסלול", "נמל", "אחו", "אלפיני",
    "זוהר ורוד", "זוהר מנטה", "זוהר קרח", "זוהר אפרסק", "זוהר דמדומים", "זוהר אוקיינוס",
  ]) {
    const choice = gallery.getByRole("button", { name, exact: true });
    await choice.scrollIntoViewIfNeeded();
    await expect(choice).toBeInViewport();
    await expectPreviewAtEdges(choice.locator("[data-theme]"));
    expect(await choice.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const modal = element.closest("dialog")?.getBoundingClientRect();
      return modal !== undefined && bounds.left >= modal.left && bounds.right <= modal.right;
    }), `${name} must fit inside the gallery`).toBe(true);
    expect(await choice.getByText(name, { exact: true }).evaluate((element) => {
      const label = element.getBoundingClientRect();
      const card = element.closest("button")?.getBoundingClientRect();
      return card !== undefined && label.top >= card.top && label.bottom <= card.bottom
        && label.left >= card.left && label.right <= card.right;
    }), `${name} must remain visibly contained in its theme card`).toBe(true);
    expect(await choice.locator("[data-theme]").evaluate((element) => {
      const preview = element.getBoundingClientRect();
      const card = element.closest("button")?.getBoundingClientRect();
      return card !== undefined && preview.left >= card.left && preview.right <= card.right;
    }), `${name} must show the full miniature workspace without cropping its sides`).toBe(true);
    expect(await choice.getByText("ייצוא PDF", { exact: true }).evaluate((element) => {
      const action = element.getBoundingClientRect();
      const preview = element.closest("[data-theme]")?.getBoundingClientRect();
      return preview !== undefined && action.top >= preview.top && action.bottom <= preview.bottom
        && action.left >= preview.left && action.right <= preview.right;
    }), `${name} must show the complete miniature Export PDF action`).toBe(true);
  }
  await gallery.getByRole("button", { name: "יער", exact: true }).click();
  await expect(gallery.getByRole("button", { name: "יער", exact: true })).toHaveAttribute("aria-pressed", "true");
  await finishThemeSelection(page);
  const hebrewSettings = page.getByRole("dialog", { name: "הגדרות", exact: true });
  await expect(hebrewSettings.getByText("יער", { exact: true })).toBeVisible();
  await expect(hebrewSettings.getByRole("combobox", { name: "גודל טקסט", exact: true })).toHaveValue("150");
  await expect(hebrewSettings.getByRole("combobox", { name: "שפה", exact: true })).toHaveValue("he");
  await expect(hebrewSettings.getByRole("combobox", { name: "מראה", exact: true })).toHaveCount(0);
  await closeSettings(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "forest");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await openSettings(page);
  await expect(hebrewSettings.getByText("יער", { exact: true })).toBeVisible();
});

test("keeps themed status and missing-page routes at the viewport edges and returns to the saved quote", async ({ page }, testInfo) => {
  await prepareQuote(page);
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", service: "Theme test API", version: "1.2.3" } }));
  for (const name of ["Default", "Aurora", "Aurora Ocean"]) {
    const gallery = await openThemeGallery(page);
    await gallery.getByRole("button", { name, exact: true }).click();
    await finishThemeSelection(page);
    await closeSettings(page);
    await page.goto("/#/status");
    await expect(page.getByRole("heading", { name: "API connected", exact: true })).toBeVisible();
    await expectWorkspaceAtViewportEdges(page, false);
    if (name === "Aurora Ocean") await page.screenshot({ path: testInfo.outputPath("aurora-ocean-status.png"), fullPage: true });
    await page.goto("/#/missing-page");
    await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
    await expectWorkspaceAtViewportEdges(page, false);
    await page.getByRole("link", { name: "Return home", exact: true }).click();
    await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Theme preview customer");
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$29.25");
    await expectWorkspaceAtViewportEdges(page);
  }
});

test("falls back to Default for an unknown saved theme without losing valid preferences", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("seatline.display.v1", JSON.stringify({
    themeId: "missing-theme", theme: "dark", locale: "en", textSize: 120,
  })));
  await page.reload();
  await openSettings(page);
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(settings.getByText("Default", { exact: true })).toBeVisible();
  await expect(settings.getByRole("combobox", { name: "Appearance", exact: true })).toHaveValue("dark");
  await expect(settings.getByRole("combobox", { name: "Text size", exact: true })).toHaveValue("120");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const gallery = await openThemeGallery(page);
  await expect(gallery.getByRole("button", { name: "Default", exact: true })).toHaveAttribute("aria-pressed", "true");
  await gallery.getByRole("button", { name: "Studio", exact: true }).click();
  await finishThemeSelection(page);
  await closeSettings(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "studio");
  await openSettings(page);
  await expect(settings.getByText("Studio", { exact: true })).toBeVisible();
  await expect(settings.getByRole("combobox", { name: "Text size", exact: true })).toHaveValue("120");
});

test("applies themes for the current visit when storage is unavailable and keeps quoting functional", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "QuotaExceededError"); };
  });
  await page.goto("/");
  const gallery = await openThemeGallery(page);
  await gallery.getByRole("button", { name: "Dune", exact: true }).click();
  await expect(gallery.getByRole("button", { name: "Dune", exact: true })).toHaveAttribute("aria-pressed", "true");
  await finishThemeSelection(page);
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(settings.getByRole("status")).toContainText("could not be saved");
  await expect(settings.getByText("Dune", { exact: true })).toBeVisible();
  await closeSettings(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dune");
  await page.getByLabel("Customer", { exact: true }).fill("Temporary theme customer");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("25");
  await line.getByRole("textbox", { name: "Profit rate", exact: true }).fill("17");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$29.25");
  await expect(page.getByRole("button", { name: "Export PDF", exact: true })).toBeEnabled();
  await page.reload();
  await openSettings(page);
  await expect(settings.getByText("Default", { exact: true })).toBeVisible();
  await expect(settings.getByRole("combobox", { name: "Appearance", exact: true })).toHaveValue("light");
});
