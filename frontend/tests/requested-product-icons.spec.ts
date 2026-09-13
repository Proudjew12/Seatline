import { closeSettings, expect, openSettings, setEditMode, test } from "./fixtures";

const brands = [
  { name: "SentinelOne", id: "sentinelone", aliases: ["Sentinel One", "Sentinel1", "סנטינל וואן"] },
  { name: "BitTitan", id: "bittitan", aliases: ["Bit Titan", "MigrationWiz", "ביטטיטאן"] },
];

for (const brand of brands) {
  test(`finds, selects and retains the ${brand.name} icon with a licensed product`, async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Seatline");
    await setEditMode(page, true);
    await page.getByRole("button", { name: "Add product", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add product", exact: true });
    const name = dialog.getByLabel("Product name", { exact: true });
    const toggle = dialog.getByRole("button", { name: "Choose icon", exact: true });
    for (const alias of [brand.name, ...brand.aliases]) {
      await name.fill(`${alias} Tools`);
      await expect(toggle.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", brand.id);
    }
    await name.fill(`Unrelated${brand.name}word`);
    await expect(toggle.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", "generic");
    await toggle.click();
    const search = dialog.getByRole("searchbox", { name: "Search icons", exact: true });
    for (const alias of [brand.name, ...brand.aliases]) {
      await search.fill(alias);
      await expect(dialog.getByRole("radio")).toHaveCount(1);
      await expect(dialog.getByRole("radio", { name: brand.name, exact: true })).toBeVisible();
    }
    const choice = dialog.getByRole("radio", { name: brand.name, exact: true });
    await choice.press("Space");
    await expect(choice).toBeChecked();
    await name.fill(`${brand.name} Services`);
    const mask = await toggle.locator("[data-product-icon]").evaluate(async (element) => {
      const mask = getComputedStyle(element).maskImage;
      const path = /^url\(["']?(.*?)["']?\)$/.exec(mask)?.[1];
      if (!path) throw new Error("The product icon has no mask asset");
      const url = new URL(path, location.href);
      const image = new Image();
      image.src = url.href;
      await image.decode();
      return { local: url.origin === location.origin, loaded: image.naturalWidth > 0, mask };
    });
    expect(mask.local).toBe(true);
    expect(mask.loaded).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${brand.id}-picker.png`) });
    await dialog.getByRole("button", { name: "Add product", exact: true }).click();
    await page.getByRole("button", { name: "Add license", exact: true }).click();
    const license = page.getByRole("dialog", { name: "Add license", exact: true });
    await license.getByLabel("License name", { exact: true }).fill("Standard seat");
    await license.getByLabel("Annual paid monthly price", { exact: true }).fill("25");
    await license.getByRole("button", { name: "Add license", exact: true }).click();
    await page.reload();
    const product = page.getByRole("button", { name: `${brand.name} Services`, exact: true });
    await expect(product.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", brand.id);
    await expect(product.locator("[data-product-icon]")).toHaveCSS("mask-image", mask.mask);
    await product.click();
    await expect(page.getByRole("button", { name: "Add Standard seat to quote", exact: true })).toBeVisible();
    await setEditMode(page, true);
    await page.getByRole("button", { name: "Edit product", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "Edit product", exact: true });
    await edit.getByRole("button", { name: "Choose icon", exact: true }).click();
    await expect(edit.getByRole("radio", { name: brand.name, exact: true })).toBeChecked();
    await edit.getByLabel("Product name", { exact: true }).fill("Renamed vendor service");
    await edit.getByRole("button", { name: "Save changes", exact: true }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Renamed vendor service", exact: true }).locator("[data-product-icon]"))
      .toHaveAttribute("data-product-icon", brand.id);
  });
}

test("keeps SentinelOne and BitTitan names readable in the Hebrew icon picker", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => localStorage.setItem("seatline.display.v1", JSON.stringify({
    textSize: 150, locale: "he", themeId: "aurora-ocean", theme: "light",
  })));
  await page.goto("/");
  await openSettings(page);
  await page.getByRole("switch", { name: "מצב עריכה", exact: true }).check();
  await closeSettings(page);
  await page.getByRole("button", { name: "הוספת מוצר", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "הוספת מוצר", exact: true });
  await dialog.getByRole("button", { name: "בחירת סמל", exact: true }).click();
  const search = dialog.getByRole("searchbox", { name: "חיפוש סמלים", exact: true });
  for (const brand of brands) {
    await search.fill(brand.aliases.at(-1) ?? brand.name);
    const choice = dialog.getByRole("radio", { name: brand.name, exact: true });
    await choice.press("Space");
    await expect(choice).toBeChecked();
    const option = choice.locator("xpath=ancestor::label[1]");
    await option.scrollIntoViewIfNeeded();
    expect(await option.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const label = option.getByText(brand.name, { exact: true });
    await expect(label).toHaveCSS("direction", "ltr");
    await expect(option.locator("[data-product-icon]")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${brand.id}-hebrew-320-150.png`) });
  }
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
