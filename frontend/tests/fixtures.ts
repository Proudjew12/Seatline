import { expect, test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

export async function openSettings(page: Page): Promise<void> {
  if (await page.getByRole("dialog", { name: /^(Settings|הגדרות)$/ }).isVisible()) return;
  await page.getByRole("button", { name: /^(Settings|הגדרות)$/ }).click();
}

export async function closeSettings(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^(Close settings|סגירת הגדרות)$/ }).click();
}

export async function setEditMode(page: Page, enabled: boolean): Promise<void> {
  await openSettings(page);
  await page.getByRole("switch", { name: "Edit Mode", exact: true }).setChecked(enabled);
  await closeSettings(page);
}

export async function setTextSize(page: Page, size: string): Promise<void> {
  await openSettings(page);
  await page.getByRole("combobox", { name: "Text size", exact: true }).selectOption(size);
  await closeSettings(page);
}

export async function expectTextSize(page: Page, size: string): Promise<void> {
  await openSettings(page);
  await expect(page.getByRole("combobox", { name: "Text size", exact: true })).toHaveValue(size);
  await closeSettings(page);
}

interface BrowserChecks {
  allowHealthRequestFailure: boolean;
  browserChecks: void;
}

export const test = base.extend<BrowserChecks>({
  allowHealthRequestFailure: [false, { option: true }],
  browserChecks: [
    async ({ page, allowHealthRequestFailure }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (!["error", "warning"].includes(message.type())) {
          return;
        }
        const isExpectedNetworkError =
          allowHealthRequestFailure &&
          message.location().url.endsWith("/api/health") &&
          message.text().startsWith("Failed to load resource:");
        if (!isExpectedNetworkError) {
          errors.push(message.text());
        }
      });

      await use();

      expect(errors, "Unexpected browser errors or warnings").toEqual([]);
      await expect(page.locator("vite-error-overlay")).toHaveCount(0);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
