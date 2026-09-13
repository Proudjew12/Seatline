import type { Locator } from "@playwright/test";

import { expect, test, setEditMode, setTextSize } from "./fixtures";

async function press(control: Locator, hasTouch: boolean): Promise<void> {
  if (hasTouch) await control.tap();
  else await control.click();
}

test("chooses every billing schedule from the open picker with mouse or touch at 150%", async ({ page, hasTouch }) => {
  await page.goto("/");
  await setEditMode(page, true);
  await page.getByRole("button", { name: "Edit Business Basic", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit license", exact: true });
  await dialog.getByLabel("Monthly price", { exact: true }).fill("12.50");
  await dialog.getByLabel("Annual paid monthly price", { exact: true }).fill("10");
  await dialog.getByLabel("Annual paid yearly price", { exact: true }).fill("120");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await setEditMode(page, false);
  await setTextSize(page, "150");
  await expect(page.getByRole("region", { name: "Licenses", exact: true }).getByRole("combobox")).toHaveCount(0);

  for (const option of [
    { label: "Annual — Pay Yearly", value: "annual-upfront", price: 120 },
    { label: "Monthly — Pay Monthly", value: "monthly", price: 12.5 },
    { label: "Annual — Pay Monthly", value: "annual-monthly", price: 10 },
  ]) {
    await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
    const line = page.getByTestId("quote-line").last();
    const picker = line.getByRole("combobox", { name: "Billing Option", exact: true });
    await expect(picker).toHaveValue("annual-monthly");
    await press(picker, hasTouch);
    const choice = picker.getByRole("option", { name: option.label, exact: true });
    await expect(choice).toBeVisible();
    const fitsViewport = await choice.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.x >= 0 && box.right <= window.innerWidth && box.y >= 0 && box.bottom <= window.innerHeight;
    });
    expect(fitsViewport, `${option.label} must remain inside the viewport`).toBe(true);
    await press(choice, hasTouch);
    await expect(picker).toHaveValue(option.value);
    await expect(line.getByRole("combobox", { name: "Billing Option", exact: true })).toHaveValue(option.value);
    expect(Number(await line.getByRole("textbox", { name: "Price", exact: true }).inputValue())).toBe(option.price);
  }
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$22.50");
  await expect(page.getByLabel("Yearly payments", { exact: true })).toHaveText("$120.00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("cancels and commits keyboard billing choices while preserving order data on reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  const picker = line.getByRole("combobox", { name: "Billing Option", exact: true });
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("15");
  await expect(line.getByText("per month", { exact: true })).toBeVisible();
  await picker.focus();
  await page.keyboard.press("Space");
  await expect(picker.getByRole("option", { name: "Annual — Pay Yearly", exact: true })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(picker).toBeFocused();
  await expect(picker).toHaveValue("annual-monthly");
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("15");
  await expect(line.getByText("per month", { exact: true })).toBeVisible();

  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(picker).toHaveValue("annual-upfront");
  const yearlyPrice = line.getByRole("textbox", { name: "Price", exact: true });
  await expect(yearlyPrice).toHaveValue("");
  await expect(line.getByText("per year", { exact: true })).toBeVisible();
  await yearlyPrice.fill("180");
  await picker.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  await expect(picker).toHaveValue("annual-upfront");
  await expect(yearlyPrice).toHaveValue("180");
  await page.reload();
  await expect(picker).toHaveValue("annual-upfront");
  await expect(yearlyPrice).toHaveValue("180");
  await expect(page.getByLabel("Yearly payments", { exact: true })).toHaveText("$180.00");
});
