import type { Locator, Page } from "@playwright/test";

import { closeSettings, expect, openSettings, setEditMode, test } from "./fixtures";

async function expectNoOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function expectDialogFits(dialog: Locator): Promise<void> {
  await expect.poll(() => dialog.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth
      && box.top >= 0 && box.bottom <= window.innerHeight
      && Array.from(element.querySelectorAll("button, select")).every((control) => {
        const bounds = control.getBoundingClientRect();
        return bounds.left >= box.left && bounds.right <= box.right;
      });
  })).toBe(true);
}

test("opens settings by keyboard, applies Edit Mode for this visit, and returns focus on Escape", async ({ page }) => {
  await page.goto("/");
  const gear = page.getByRole("button", { name: "Settings", exact: true });
  await expect(gear).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Text size", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add product", exact: true })).toHaveCount(0);
  await gear.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Settings", exact: true });
  const editMode = dialog.getByRole("switch", { name: "Edit Mode", exact: true });
  await expect(dialog).toBeVisible();
  await expect(editMode).toBeFocused();
  await expect(editMode).not.toBeChecked();
  await expect(dialog.getByRole("combobox", { name: "Text size", exact: true })).toHaveValue("100");
  await expect(dialog.getByRole("combobox", { name: "Appearance", exact: true })).toHaveValue("light");
  await expect(dialog.getByRole("combobox", { name: "Language", exact: true })).toHaveValue("en");
  await page.keyboard.press("Space");
  await expect(editMode).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(gear).toBeFocused();
  await expect(page.getByRole("button", { name: "Add product", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Business Basic", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Add product", exact: true })).toHaveCount(0);
  await openSettings(page);
  await expect(editMode).not.toBeChecked();
  await closeSettings(page);
  await setEditMode(page, true);
  await setEditMode(page, false);
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  await expect(page.getByTestId("quote-line")).toHaveCount(1);
});

test("persists theme, language, and text size while preserving the quote and restoring English", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("לקוח הגדרות");
  await page.getByLabel("Sales Proposal", { exact: true }).fill("SETTINGS-12");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByLabel("Quantity", { exact: true }).fill("2");
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("15");
  const lightBackground = await page.getByRole("main").evaluate((element) => getComputedStyle(element).backgroundColor);
  const initialTextSize = await line.evaluate((element) => getComputedStyle(element).fontSize);
  await openSettings(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
  await dialog.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
  await expect.poll(() => page.getByRole("main").evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(lightBackground);
  await dialog.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
  await expect(page.getByRole("dialog", { name: "הגדרות", exact: true })).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "מראה", exact: true })).toHaveValue("dark");
  await expect(dialog.getByRole("combobox", { name: "גודל טקסט", exact: true })).toHaveValue("150");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await closeSettings(page);
  await expect(page.getByLabel("לקוח", { exact: true })).toHaveValue("לקוח הגדרות");
  await expect(page.getByRole("button", { name: "ייצוא PDF", exact: true })).toBeEnabled();
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$30.00");
  await page.reload();
  await expect(page).toHaveTitle("Seatline");
  await expect(page.getByLabel("לקוח", { exact: true })).toHaveValue("לקוח הגדרות");
  await expect(page.getByLabel("הצעת מכירה", { exact: true })).toHaveValue("SETTINGS-12");
  await expect(line.getByLabel("כמות", { exact: true })).toHaveValue("2");
  await expect(line.getByRole("textbox", { name: "מחיר", exact: true })).toHaveValue("15");
  await expect.poll(() => line.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)))
    .toBeCloseTo(Number.parseFloat(initialTextSize) * 1.5, 2);
  await openSettings(page);
  await expect(dialog.getByRole("combobox", { name: "מראה", exact: true })).toHaveValue("dark");
  await expect(dialog.getByRole("combobox", { name: "שפה", exact: true })).toHaveValue("he");
  await expect(dialog.getByRole("combobox", { name: "גודל טקסט", exact: true })).toHaveValue("150");
  await dialog.getByRole("combobox", { name: "שפה", exact: true }).selectOption("en");
  await expect(dialog.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await dialog.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("light");
  await closeSettings(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect.poll(() => page.getByRole("main").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(lightBackground);
  await expect(page.getByRole("button", { name: "Export PDF", exact: true })).toBeEnabled();
  await expectNoOverflow(page);
});

test("uses the legacy text preference and preserves it after saving new settings", async ({ page }) => {
  const legacy = JSON.stringify({ textSize: 120 });
  await page.addInitScript((value) => localStorage.setItem("saleprice.display.v1", value), legacy);
  await page.goto("/");
  await openSettings(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox", { name: "Text size", exact: true })).toHaveValue("120");
  await dialog.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
  await dialog.getByRole("combobox", { name: "Text size", exact: true }).selectOption("110");
  await closeSettings(page);
  expect(await page.evaluate(() => localStorage.getItem("saleprice.display.v1"))).toBe(legacy);
  await page.reload();
  await openSettings(page);
  await expect(dialog.getByRole("combobox", { name: "Text size", exact: true })).toHaveValue("110");
  await expect(dialog.getByRole("combobox", { name: "Appearance", exact: true })).toHaveValue("dark");
  expect(await page.evaluate(() => localStorage.getItem("saleprice.display.v1"))).toBe(legacy);
});

test("recovers from unsupported stored preferences and still lets the user change them", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("seatline.display.v1", JSON.stringify({
    textSize: "150", locale: "unsupported", theme: "unsupported",
  })));
  await page.goto("/");
  await openSettings(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox", { name: "Text size", exact: true })).toHaveValue("100");
  await expect(dialog.getByRole("combobox", { name: "Language", exact: true })).toHaveValue("en");
  await expect(dialog.getByRole("combobox", { name: "Appearance", exact: true })).toHaveValue("light");
  await dialog.getByRole("combobox", { name: "Text size", exact: true }).selectOption("110");
  await dialog.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
  await closeSettings(page);
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  await expect(page.getByTestId("quote-line")).toHaveCount(1);
});

test("keeps settings and quoting usable when browser storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "QuotaExceededError"); };
  });
  await page.goto("/");
  await openSettings(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
  await dialog.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
  await dialog.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
  await expect(dialog.getByRole("status")).toContainText("לא ניתן היה לשמור");
  await expect(dialog.getByRole("combobox", { name: "גודל טקסט", exact: true })).toHaveValue("150");
  await expect(dialog.getByRole("combobox", { name: "מראה", exact: true })).toHaveValue("dark");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await closeSettings(page);
  await page.getByLabel("לקוח", { exact: true }).fill("לקוח ללא אחסון");
  await page.getByRole("button", { name: "הוספת Business Basic להצעה", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByLabel("כמות", { exact: true }).fill("2");
  await line.getByRole("textbox", { name: "מחיר", exact: true }).fill("15");
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$30.00");
  await expect(page.getByRole("button", { name: "ייצוא PDF", exact: true })).toBeEnabled();
  await expectNoOverflow(page);
});

test("fits Hebrew settings and a priced quote at 150% in dark mode on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await openSettings(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Text size", exact: true }).selectOption("150");
  await dialog.getByRole("combobox", { name: "Appearance", exact: true }).selectOption("dark");
  await dialog.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
  await expectDialogFits(dialog);
  await expectNoOverflow(page);
  await closeSettings(page);
  await page.getByLabel("לקוח", { exact: true }).fill("לקוח למסך קטן");
  await page.getByRole("button", { name: "הוספת Business Basic להצעה", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByLabel("כמות", { exact: true }).fill("2");
  await line.getByRole("textbox", { name: "מחיר", exact: true }).fill("25");
  await line.getByRole("textbox", { name: "שיעור רווח", exact: true }).fill("10");
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$55.00");
  await expect(page.getByRole("button", { name: "ייצוא PDF", exact: true })).toBeEnabled();
  await expect.poll(() => line.evaluate((element) => {
    const card = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll("input, select")).every((control) => {
      const box = control.getBoundingClientRect();
      return box.left >= card.left && box.right <= card.right;
    });
  })).toBe(true);
  await expectNoOverflow(page);
  await openSettings(page);
  await expectDialogFits(dialog);
});
