import { expect, setEditMode, test } from "./fixtures";

test("creates and quotes new security and migration vendors, retaining their selected icons", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "New vendor persistence is independent of viewport size");
  await page.goto("/");
  const vendors = [
    { name: "CrowdStrike", alias: "Crowd Strike Falcon", id: "crowdstrike", category: "security" },
    { name: "ShareGate", alias: "Share Gate", id: "sharegate", category: "backup" },
  ];
  for (const vendor of vendors) {
    await setEditMode(page, true);
    await page.getByRole("button", { name: "Add product", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add product", exact: true });
    await dialog.getByLabel("Product name", { exact: true }).fill(`${vendor.alias} Services`);
    const toggle = dialog.getByRole("button", { name: "Choose icon", exact: true });
    await expect(toggle.locator("[data-product-icon]")).toHaveAttribute("data-product-icon", vendor.id);
    await toggle.click();
    await dialog.getByRole("combobox", { name: "Icon category", exact: true }).selectOption(vendor.category);
    await dialog.getByRole("searchbox", { name: "Search icons", exact: true }).fill(vendor.name);
    const choice = dialog.getByRole("radio", { name: vendor.name, exact: true });
    await choice.press("Space");
    await expect(choice).toBeChecked();
    await page.screenshot({ path: testInfo.outputPath(`${vendor.id}-category.png`) });
    await dialog.getByRole("button", { name: "Add product", exact: true }).click();
    await page.getByRole("button", { name: "Add license", exact: true }).click();
    const license = page.getByRole("dialog", { name: "Add license", exact: true });
    await license.getByLabel("License name", { exact: true }).fill(`${vendor.name} Standard`);
    await license.getByLabel("Annual paid monthly price", { exact: true }).fill("25");
    await license.getByRole("button", { name: "Add license", exact: true }).click();
    await setEditMode(page, false);
    await page.getByRole("button", { name: `Add ${vendor.name} Standard to quote`, exact: true }).press("Enter");
    await expect(page.getByRole("group", { name: `${vendor.name} Standard`, exact: true })
      .getByRole("textbox", { name: "Price", exact: true })).toHaveValue("25");
  }
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$50.00");
  await page.reload();
  for (const vendor of vendors) {
    await expect(page.getByRole("button", { name: `${vendor.alias} Services`, exact: true })
      .locator("[data-product-icon]")).toHaveAttribute("data-product-icon", vendor.id);
  }
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$50.00");
});
