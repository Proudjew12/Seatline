import { closeSettings, expect, openSettings, setEditMode, test } from "./fixtures";

test("disables pointer dragging in Edit Mode and restores it in Normal Mode", async ({ page, context, hasTouch }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/");
  const card = page.getByRole("button", { name: "Add Business Basic to quote", exact: true });
  const target = page.getByRole("region", { name: "Quote items", exact: true });
  for (const editing of [true, false, true]) {
    await setEditMode(page, editing);
    const sourceBox = await card.boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) throw new Error("Catalog and quote must be visible for dragging.");
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
    if (!editing) await page.getByRole("button", { name: "Remove Business Basic", exact: true }).click();
    await expect(page.getByRole("button", { name: "Edit Business Basic", exact: true })).toHaveCount(editing ? 1 : 0);
  }
});

test("mirrors the Hebrew quote and catalog editor, preserving English names and customer totals", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("דוד כהן");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByTestId("quote-line");
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("25");
  await line.getByRole("textbox", { name: "Profit rate", exact: true }).fill("17");
  await openSettings(page);
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
  await closeSettings(page);
  await expect(page.getByLabel("לקוח", { exact: true })).toHaveValue("דוד כהן");
  const customer = page.getByLabel("לקוח", { exact: true });
  const notes = page.getByLabel("הערות", { exact: true });
  const search = page.getByRole("searchbox", { name: "חיפוש רישיונות", exact: true });
  await expect(search).toHaveCSS("direction", "rtl");
  await search.fill("Basic");
  await expect(search).toHaveCSS("direction", "ltr");
  await expect(page.getByRole("article")).toHaveCount(1);
  await search.fill("");
  await expect(search).toHaveCSS("direction", "rtl");
  await expect(notes).toHaveCSS("direction", "rtl");
  await customer.fill("");
  await expect(customer).toHaveCSS("direction", "rtl");
  await customer.fill("Acme 365");
  await expect(customer).toHaveCSS("direction", "ltr");
  await customer.fill("דוד כהן");
  await expect(customer).toHaveCSS("direction", "rtl");
  const heading = line.getByRole("heading");
  await expect(heading).toHaveAccessibleName("Microsoft 365 Business Basic");
  await expect(heading.getByText("Microsoft 365", { exact: true })).toHaveAttribute("dir", "ltr");
  await expect(heading.getByText("Business Basic", { exact: true })).toHaveAttribute("dir", "ltr");
  const productTitle = await heading.getByText("Microsoft 365", { exact: true }).boundingBox();
  const licenseTitle = await heading.getByText("Business Basic", { exact: true }).boundingBox();
  if (!productTitle || !licenseTitle) throw new Error("Translated quotes must retain complete product and license titles");
  expect(productTitle.y + productTitle.height).toBeLessThanOrEqual(licenseTitle.y);
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$29.25");
  await expect(page.getByRole("button", { name: "ייצוא PDF", exact: true })).toBeEnabled();
  const rail = page.getByRole("navigation", { name: "מוצרים", exact: true });
  const catalog = page.getByRole("region", { name: "רישיונות", exact: true });
  if ((page.viewportSize()?.width ?? 0) > 700) {
    const [railBox, catalogBox, quoteBox] = await Promise.all([rail.boundingBox(), catalog.boundingBox(), page.getByRole("main").boundingBox()]);
    if (!railBox || !catalogBox || !quoteBox) throw new Error("RTL layout regions must be present.");
    expect(railBox.x).toBeGreaterThan(catalogBox.x);
    expect(catalogBox.x).toBeGreaterThan(quoteBox.x);
  }
  for (const theme of ["light", "dark"]) {
    await openSettings(page);
    await page.getByRole("combobox", { name: "מראה", exact: true }).selectOption(theme);
    await closeSettings(page);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const screenshot = testInfo.outputPath(`seatline-he-${theme}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach(`Hebrew ${theme}`, { path: screenshot, contentType: "image/png" });
  }
  await openSettings(page);
  await page.getByRole("switch", { name: "מצב עריכה", exact: true }).check();
  await closeSettings(page);
  await page.getByRole("button", { name: "עריכת Business Basic", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "עריכת רישיון", exact: true });
  const licenseName = dialog.getByLabel("שם הרישיון", { exact: true });
  await expect(licenseName).toHaveValue("Business Basic");
  await licenseName.fill("");
  await dialog.getByRole("button", { name: "שמירת שינויים", exact: true }).click();
  await expect(licenseName).toHaveJSProperty("validationMessage", "יש למלא שדה זה.");
  await licenseName.fill("Business Basic");
  await expect(licenseName).toHaveJSProperty("validationMessage", "");
  await dialog.getByLabel("מחיר חודשי", { exact: true }).fill("-1");
  await dialog.getByRole("button", { name: "שמירת שינויים", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("הזינו מחיר");
  await dialog.getByRole("button", { name: "ביטול", exact: true }).click();
  await expect(page.getByLabel("תשלומים חודשיים", { exact: true })).toHaveText("$29.25");
});

test("migrates the previous catalog without restoring deleted products or losing defaults", async ({ page }) => {
  const legacy = JSON.stringify({ version: 2, seedRevision: 1, products: [{
    id: "custom-tools", name: "My Tools", shortName: "MT", licenses: [{
      id: "custom-seat", name: "My License", prices: { monthly: "20", "annual-monthly": "25", "annual-upfront": "240" },
    }],
  }] });
  await page.addInitScript((value) => localStorage.setItem("saleprice.catalog.v2", value), legacy);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Microsoft 365", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Add My License to quote", exact: true }).press("Enter");
  await expect(page.getByTestId("quote-line").getByRole("textbox", { name: "Price", exact: true })).toHaveValue("25");
  expect(await page.evaluate(() => localStorage.getItem("saleprice.catalog.v2"))).toBe(legacy);
  await page.reload();
  await expect(page.getByRole("button", { name: "My Tools", exact: true })).toBeVisible();
  await expect(page.getByTestId("quote-line")).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("saleprice.catalog.v2"))).toBe(legacy);
});

test("keeps Hebrew and dark mode when the router displays a recoverable application error", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("seatline.display.v1", JSON.stringify({
    textSize: 120, theme: "dark", locale: "he",
  })));
  await page.goto("/");
  await expect(page.getByRole("main", { name: "הזמנה", exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const modulePath = "/src/app/router.tsx";
    const { router } = await import(modulePath) as {
      router: { routes: { loader?: () => never }[]; revalidate: () => Promise<void> };
    };
    router.routes[0].loader = () => { throw new Error("Test service unavailable"); };
    await router.revalidate();
  });
  await expect(page.getByRole("alert")).toContainText("אירעה שגיאה");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "טעינת הדף מחדש", exact: true }).click();
  await expect(page.getByRole("main", { name: "הזמנה", exact: true })).toBeVisible();
});
