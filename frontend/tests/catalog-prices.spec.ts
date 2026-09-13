import { expect, test, setEditMode, setTextSize } from "./fixtures";

test("shows every saved catalog price after reload and distinguishes zero from an unset schedule", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.goto("/");
  await setTextSize(page, "150");
  const card = page.getByRole("article", { name: "Business Basic", exact: true });
  await expect(card.getByText("Not set", { exact: true })).toHaveCount(3);
  await setEditMode(page, true);
  await page.getByRole("button", { name: "Edit Business Basic", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit license", exact: true });
  await editor.getByLabel("Monthly price", { exact: true }).fill("21");
  await editor.getByLabel("Annual paid monthly price", { exact: true }).fill("22");
  await editor.getByLabel("Annual paid yearly price", { exact: true }).fill("23");
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await setEditMode(page, false);
  for (const label of ["Monthly", "Annual · Monthly", "Annual · Yearly"]) {
    await expect(card.getByText(label, { exact: true })).toBeVisible();
  }
  for (const price of ["$21.00", "$22.00", "$23.00"]) {
    const amount = card.getByText(price, { exact: true });
    await expect(amount).toBeVisible();
    expect(await amount.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const fragments = range.getClientRects();
      const container = element.parentElement?.getBoundingClientRect();
      return fragments.length === 1 && container !== undefined
        && fragments[0].left >= container.left && fragments[0].right <= container.right;
    }), `${price} must remain whole inside its price column at 150%`).toBe(true);
  }
  await expect(card.getByText("/ mo", { exact: true })).toHaveCount(2);
  await expect(card.getByText("/ yr", { exact: true })).toBeVisible();
  await setTextSize(page, "100");
  for (const width of [1867, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const label = card.getByText("Annual · Monthly", { exact: true });
    await expect(label).toBeVisible();
    expect(await label.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const fragments = range.getClientRects();
      const box = element.getBoundingClientRect();
      return fragments.length === 1 && fragments[0].left >= box.left && fragments[0].right <= box.right;
    }), `Annual · Monthly must fit on one line at ${width}px and 100%`).toBe(true);
  }
  await page.setViewportSize({ width: 834, height: 1194 });
  await setTextSize(page, "150");
  await page.reload();
  await card.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  const billing = line.getByRole("combobox", { name: "Billing Option", exact: true });
  const priceInput = line.getByRole("textbox", { name: "Price", exact: true });
  await expect(priceInput).toHaveValue("22");
  for (const [schedule, price] of [["monthly", "21"], ["annual-monthly", "22"], ["annual-upfront", "23"]]) {
    await billing.selectOption(schedule);
    await expect(priceInput).toHaveValue(price);
    for (const amount of ["$21.00", "$22.00", "$23.00"]) {
      await expect(card.getByText(amount, { exact: true })).toBeVisible();
    }
  }

  await setEditMode(page, true);
  await page.getByRole("button", { name: "Edit Business Basic", exact: true }).click();
  await editor.getByLabel("Monthly price", { exact: true }).fill("0");
  await editor.getByLabel("Annual paid monthly price", { exact: true }).clear();
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await expect(card.getByText("$0.00", { exact: true })).toBeVisible();
  await expect(card.getByText("Not set", { exact: true })).toHaveCount(1);
  await expect(card.getByText("$23.00", { exact: true })).toBeVisible();
  await expect(card.getByText("/ mo", { exact: true })).toHaveCount(1);
  await expect(priceInput).toHaveValue("23");
  await billing.selectOption("monthly");
  await expect(priceInput).toHaveValue("0");
  await billing.selectOption("annual-monthly");
  await expect(priceInput).toHaveValue("");
});
