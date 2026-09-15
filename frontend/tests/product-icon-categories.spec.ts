import type { Locator, Page } from "@playwright/test";

import { closeSettings, expect, openSettings, setEditMode, test } from "./fixtures";

const categories = [
  { id: "general", name: "General symbols" },
  { id: "productivity", name: "Productivity & Email" },
  { id: "collaboration", name: "Collaboration & Projects" },
  { id: "security", name: "Security & Identity" },
  { id: "backup", name: "Backup & Migration" },
  { id: "infrastructure", name: "IT & Cloud" },
  { id: "design", name: "Design & Documents" },
  { id: "development", name: "Development Tools" },
  { id: "business", name: "Business & Analytics" },
] as const;

async function openPicker(page: Page): Promise<Locator> {
  await setEditMode(page, true);
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add product", exact: true });
  await dialog.getByRole("button", { name: "Choose icon", exact: true }).click();
  return dialog;
}

test("groups every icon once and filters all nine categories without changing the selected icon", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Category membership is shared by all viewports");
  await page.goto("/");
  const registered = await page.evaluate(async () => {
    const modulePath = "/src/features/catalog/icons/productIcons.ts";
    const { PRODUCT_ICONS } = await import(modulePath) as {
      PRODUCT_ICONS: ReadonlyArray<{ id: string; category: string }>;
    };
    return PRODUCT_ICONS.map(({ id, category }) => ({ id, category }));
  });
  const dialog = await openPicker(page);
  const selector = dialog.getByRole("combobox", { name: "Icon category", exact: true });
  const results = dialog.getByRole("group", { name: "Available icons", exact: true });
  const selected = dialog.getByRole("button", { name: "Choose icon", exact: true }).locator("[data-product-icon]");
  await expect(selector).toHaveValue("all");
  await expect(results.getByRole("heading")).toHaveText(categories.map(({ name }) => name));
  await expect(results.getByRole("radio")).toHaveCount(registered.length);
  expect(registered.length).toBeGreaterThanOrEqual(97);
  expect(new Set(registered.map(({ category }) => category))).toEqual(new Set(categories.map(({ id }) => id)));
  await page.screenshot({ path: testInfo.outputPath("icon-categories-desktop.png") });

  for (const category of categories) {
    await selector.selectOption(category.id);
    await expect(results.getByRole("heading")).toHaveText([category.name]);
    const expectedIds = registered.filter((icon) => icon.category === category.id).map(({ id }) => id).sort();
    expect(expectedIds.length).toBeGreaterThan(0);
    await expect(results.getByRole("radio")).toHaveCount(expectedIds.length);
    await expect(dialog.getByRole("status")).toHaveText(`${expectedIds.length} ${expectedIds.length === 1 ? "icon" : "icons"}`);
    expect(await results.getByRole("radio").evaluateAll((radios) => radios.map((radio) => (radio as HTMLInputElement).value).sort()))
      .toEqual(expectedIds);
    await expect(selected).toHaveAttribute("data-product-icon", "generic");
    await expect(results.getByRole("radio", { checked: true })).toHaveCount(category.id === "general" ? 1 : 0);
  }
  await dialog.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(selector).toHaveValue("all");
  await expect(results.getByRole("heading")).toHaveText(categories.map(({ name }) => name));
  await expect(results.getByRole("radio", { name: "General", exact: true })).toBeChecked();
});

test("suggests every named vendor icon without matching a brand inside an unrelated word", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Name inference uses the same registry at every viewport");
  await page.goto("/");
  const audit = await page.evaluate(async () => {
    const modulePath = "/src/features/catalog/icons/productIcons.ts";
    const { PRODUCT_ICONS, suggestProductIcon } = await import(modulePath) as {
      PRODUCT_ICONS: ReadonlyArray<{ id: string; name: string; category: string }>;
      suggestProductIcon: (name: string) => string;
    };
    return PRODUCT_ICONS.filter(({ category }) => category !== "general").map((icon) => ({
      id: icon.id,
      name: icon.name,
      suggested: suggestProductIcon(icon.name),
      // Whole brand words may match; an unrelated word containing the same letters must not.
      embedded: suggestProductIcon(`Unrelated${icon.name.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "")}word`),
    }));
  });
  expect(audit.length).toBeGreaterThanOrEqual(89);
  for (const icon of audit) {
    expect(icon.suggested, `${icon.name} should suggest its registered vendor icon`).toBe(icon.id);
    expect(icon.embedded, `${icon.name} should not match inside an unrelated word`).toBe("generic");
  }
});

test("intersects categories and aliases, recovers empty results, and saves keyboard selections through editing and reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Filtering and persistence are shared by all viewports");
  await page.goto("/");
  const dialog = await openPicker(page);
  await dialog.getByLabel("Product name", { exact: true }).fill("Managed endpoints");
  const selector = dialog.getByRole("combobox", { name: "Icon category", exact: true });
  const search = dialog.getByRole("searchbox", { name: "Search icons", exact: true });
  const selected = dialog.getByRole("button", { name: "Choose icon", exact: true }).locator("[data-product-icon]");
  await selector.selectOption("security");
  await search.fill("sentinel one");
  const sentinel = dialog.getByRole("radio", { name: "SentinelOne", exact: true });
  await expect(dialog.getByRole("radio")).toHaveCount(1);
  await sentinel.press("Space");
  await expect(sentinel).toBeChecked();
  await selector.selectOption("backup");
  await expect(dialog.getByRole("radio")).toHaveCount(0);
  await expect(dialog.getByText("No icons found. Try another name.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("0 icons");
  await expect(selected).toHaveAttribute("data-product-icon", "sentinelone");
  await search.fill("MigrationWiz");
  await expect(dialog.getByRole("radio", { name: "BitTitan", exact: true })).toBeVisible();
  await expect(dialog.getByRole("radio")).toHaveCount(1);
  await expect(selected).toHaveAttribute("data-product-icon", "sentinelone");
  await search.fill("no-vendor-matches-this-phrase");
  await search.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Clear filters", exact: true }).press("Enter");
  await expect(selector).toHaveValue("all");
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(sentinel).toBeChecked();
  await dialog.getByRole("button", { name: "Add product", exact: true }).press("Enter");
  const product = page.getByRole("button", { name: "Managed endpoints", exact: true });
  await expect(product.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "sentinelone");
  await page.reload();
  await expect(product.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "sentinelone");

  await product.click();
  await setEditMode(page, true);
  await page.getByRole("button", { name: "Edit product", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit product", exact: true });
  await edit.getByRole("button", { name: "Choose icon", exact: true }).click();
  await expect(edit.getByRole("radio", { name: "SentinelOne", exact: true })).toBeChecked();
  await edit.getByRole("combobox", { name: "Icon category", exact: true }).selectOption("backup");
  await edit.getByRole("searchbox", { name: "Search icons", exact: true }).fill("migration wiz");
  const bittitan = edit.getByRole("radio", { name: "BitTitan", exact: true });
  await bittitan.press("Space");
  await expect(bittitan).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath("icon-category-backup-search.png") });
  await edit.getByLabel("Product name", { exact: true }).fill("Migration service");
  await edit.getByRole("button", { name: "Save changes", exact: true }).press("Enter");
  await page.reload();
  await expect(page.getByRole("button", { name: "Migration service", exact: true }).locator("[data-product-icon]"))
    .toHaveAttribute("data-product-icon", "bittitan");
});

test("searches Hebrew category keywords and keeps category controls and English brands usable at 320px and 150%", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "This case sets its own narrow Hebrew viewport");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => localStorage.setItem("seatline.display.v1", JSON.stringify({
    textSize: 150, locale: "he", themeId: "aurora-ocean", theme: "light",
  })));
  await page.goto("/");
  await openSettings(page);
  await page.getByRole("switch", { name: "מצב עריכה", exact: true }).check();
  await closeSettings(page);
  const trigger = page.getByRole("button", { name: "הוספת מוצר", exact: true });
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "הוספת מוצר", exact: true });
  await dialog.getByLabel("שם המוצר", { exact: true }).fill("שירותי הגנה");
  await dialog.getByRole("button", { name: "בחירת סמל", exact: true }).press("Enter");
  const selector = dialog.getByRole("combobox", { name: "קטגוריית סמלים", exact: true });
  const search = dialog.getByRole("searchbox", { name: "חיפוש סמלים", exact: true });
  await search.fill("זהויות");
  await expect(selector).toHaveValue("all");
  const choices = dialog.getByRole("group", { name: "סמלים זמינים", exact: true });
  await expect(choices.getByRole("heading")).toHaveText(["אבטחה וניהול זהויות"]);
  await expect(dialog.getByRole("radio", { name: "SentinelOne", exact: true })).toBeVisible();
  expect(await dialog.getByRole("radio").count()).toBeGreaterThan(1);
  await selector.selectOption("security");
  await search.fill("סנטינל וואן");
  const choice = dialog.getByRole("radio", { name: "SentinelOne", exact: true });
  await choice.press("Space");
  await expect(choice).toBeChecked();
  await expect(choice).toBeFocused();
  const option = choice.locator("xpath=ancestor::label[1]");
  await expect(option.getByText("SentinelOne", { exact: true })).toHaveCSS("direction", "ltr");
  await expect(option).toHaveCSS("outline-style", "solid");
  await expect(option).toHaveCSS("outline-width", "2px");
  for (const control of [selector, search, option]) {
    await control.scrollIntoViewIfNeeded();
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
    expect(await control.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("icon-categories-hebrew-320-150.png") });
  await dialog.getByRole("button", { name: "הוספת מוצר", exact: true }).press("Enter");
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(page.getByRole("button", { name: "שירותי הגנה", exact: true }).locator("[data-product-icon]"))
    .toHaveAttribute("data-product-icon", "sentinelone");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
