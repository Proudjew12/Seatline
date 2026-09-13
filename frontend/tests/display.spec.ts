import type { Locator, Page } from "@playwright/test";

import { expect, test, openSettings, closeSettings, setTextSize, expectTextSize } from "./fixtures";

const displayKey = "seatline.display.v1";

async function fontSize(element: Locator): Promise<number> {
  return element.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("fits five, three and two cards across wide, desktop and tablet screens without stretching a lone card", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1867, height: 1000 });
  await page.goto("/");
  await expectTextSize(page, "100");
  for (const name of ["Business Basic", "Business Standard", "Business Premium", "Business Basic", "Business Standard"]) {
    await page.getByRole("button", { name: `Add ${name} to quote`, exact: true }).press("Enter");
  }
  const cards = page.getByTestId("quote-line");
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) {
    await card.getByRole("textbox", { name: "Price", exact: true }).fill("20");
    await card.getByRole("textbox", { name: "Profit rate", exact: true }).fill("32");
  }
  await openSettings(page);
  await page.getByRole("button", { name: "Browse themes", exact: true }).click();
  const gallery = page.getByRole("dialog", { name: "Choose your theme", exact: true });
  await gallery.getByRole("button", { name: "Aurora Ocean", exact: true }).click();
  await gallery.getByRole("button", { name: "Done", exact: true }).click();
  await closeSettings(page);
  const positions = () => cards.evaluateAll((elements) => elements.map((element) => {
    const { x, y, width } = element.getBoundingClientRect();
    return { x, y, width };
  }));
  const viewports = [
    { width: 1867, height: 1000, columns: 5 },
    { width: 1440, height: 900, columns: 3 },
    { width: 1180, height: 820, columns: 2 },
  ];
  const cardWidths = new Map<number, number>();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const boxes = await positions();
      const firstRow = boxes.filter((box) => Math.abs(box.y - boxes[0].y) < 1);
      return firstRow.length === viewport.columns
        && firstRow.every((box, index) => index === 0 || firstRow[index - 1].x + firstRow[index - 1].width <= box.x)
        && (boxes.length === viewport.columns || boxes[viewport.columns].y > boxes[0].y)
        && boxes.every((box) => Math.abs(box.width - boxes[0].width) < 1);
    }).toBe(true);
    const width = (await positions())[0].width;
    cardWidths.set(viewport.width, width);
    if (viewport.width === 1867) expect(width, "Five desktop cards must each stay below 280px").toBeLessThan(280);
    for (const card of await cards.all()) {
      const [cardBox, headingBox] = await Promise.all([card, card.getByRole("heading", { level: 2 })].map((element) => element.boundingBox()));
      if (!cardBox || !headingBox) throw new Error("Each quote card must have a visible heading");
      expect(headingBox.x + headingBox.width / 2, "The title must be centered in the entire card")
        .toBeCloseTo(cardBox.x + cardBox.width / 2, 0);
      const [billingBox, rateBox] = await Promise.all([
        card.getByRole("combobox", { name: "Billing Option", exact: true }),
        card.getByRole("textbox", { name: "Profit rate", exact: true }),
      ].map((control) => control.boundingBox()));
      if (!billingBox || !rateBox) throw new Error("Billing Option and Profit rate must be visible");
      expect(billingBox.y, "Billing Option and Profit rate must remain together even with five cards per row").toBeCloseTo(rateBox.y, 0);
      expect(billingBox.x + billingBox.width).toBeLessThanOrEqual(rateBox.x);
    }
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$132.00");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`compact-five-cards-aurora-ocean-${viewport.width}.png`) });
  }
  while (await cards.count() > 1) await cards.last().getByRole("button", { name: /^Remove / }).click();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const multipleWidth = cardWidths.get(viewport.width);
    if (multipleWidth === undefined) throw new Error("Each viewport needs a measured multi-card width");
    expect((await positions())[0].width, "Removing neighbors must not turn the remaining card into a full-width panel").toBeCloseTo(multipleWidth, 1);
  }
});

test("keeps every billing option beside two-digit and decimal profit rates in five-card rows", async ({ page }) => {
  await page.setViewportSize({ width: 1854, height: 1000 });
  await page.goto("/");
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  }
  const cards = page.getByTestId("quote-line");
  await expect(cards).toHaveCount(5);
  const line = cards.first();
  const billing = line.getByRole("combobox", { name: "Billing Option", exact: true });
  const price = line.getByRole("textbox", { name: "Price", exact: true });
  const profit = line.getByRole("textbox", { name: "Profit rate", exact: true });
  for (const width of [1854, 1867]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => cards.evaluateAll((elements) => {
      const boxes = elements.map((element) => element.getBoundingClientRect());
      return boxes.filter((box) => Math.abs(box.y - boxes[0].y) < 1).length;
    })).toBe(5);
    for (const option of ["monthly", "annual-upfront", "annual-monthly"]) {
      await billing.selectOption(option);
      await expect(billing).toHaveValue(option);
      await expect(price).toHaveValue("");
      await price.fill("20");
      for (const rate of ["32", "99.99"]) {
        await profit.fill(rate);
        await expect(line.getByLabel("Business Basic line total", { exact: true })).toHaveText(rate === "32" ? "$26.40" : "$40.00");
        const geometry = await line.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const fields = Array.from(element.querySelectorAll("label")).map((label) => {
            const control = label.querySelector("input, select")?.getBoundingClientRect();
            const title = label.querySelector(":scope > span");
            if (!control || !title) throw new Error("Quote controls must retain their visible labels");
            const range = document.createRange();
            range.selectNodeContents(title);
            const text = range.getBoundingClientRect();
            return { x: control.x, y: control.y, right: control.right,
              centerOffset: Math.abs(text.x + text.width / 2 - control.x - control.width / 2) };
          });
          return { left: bounds.left, right: bounds.right, width: bounds.width, fields };
        });
        expect(geometry.width).toBeLessThan(280);
        expect(geometry.fields).toHaveLength(4);
        const [billingBox, profitBox] = geometry.fields;
        expect(billingBox.y, `${option} and ${rate}% must share a row at ${width}px`).toBeCloseTo(profitBox.y, 0);
        expect(billingBox.right).toBeLessThanOrEqual(profitBox.x);
        for (const field of geometry.fields) {
          expect(field.x).toBeGreaterThanOrEqual(geometry.left);
          expect(field.right).toBeLessThanOrEqual(geometry.right);
          expect(field.centerOffset, "Every field label must remain centered above its control").toBeLessThanOrEqual(1);
        }
        await expectNoHorizontalOverflow(page);
      }
    }
  }
});

test("keeps billing readable and numeric fields contained at 150% on portrait tablets and narrow phones", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.goto("/");
  await expectTextSize(page, "100");
  await setTextSize(page, "150");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  const billing = line.getByRole("combobox", { name: "Billing Option", exact: true });
  const quantity = line.getByLabel("Quantity", { exact: true });
  const price = line.getByRole("textbox", { name: "Price", exact: true });
  const markup = line.getByRole("textbox", { name: "Profit rate", exact: true });
  await quantity.fill("3");
  await price.fill("21");
  await markup.fill("17");
  for (const viewport of [{ width: 834, height: 1194 }, { width: 320, height: 700 }]) {
    await page.setViewportSize(viewport);
    await line.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`quote-${viewport.width}-150-percent.png`) });
    await testInfo.attach(`Input bounds at ${viewport.width}px`, {
      body: JSON.stringify(await Promise.all([line, billing, quantity, price, markup].map((control) => control.boundingBox()))),
      contentType: "application/json",
    });
    await expect.poll(async () => {
      const [cardBox, billingBox, quantityBox, priceBox, markupBox] = await Promise.all(
        [line, billing, quantity, price, markup].map((control) => control.boundingBox()),
      );
      if (!cardBox || !billingBox || !quantityBox || !priceBox || !markupBox) return false;
      return Math.max(billingBox.y + billingBox.height, markupBox.y + markupBox.height) <= Math.min(quantityBox.y, priceBox.y)
        && (billingBox.x + billingBox.width <= markupBox.x || billingBox.y + billingBox.height <= markupBox.y)
        && (quantityBox.x + quantityBox.width <= priceBox.x || quantityBox.y + quantityBox.height <= priceBox.y)
        && [billingBox, quantityBox, priceBox, markupBox].every((box) => box.x >= cardBox.x && box.x + box.width <= cardBox.x + cardBox.width);
    }).toBe(true);
    await expect.poll(() => line.locator("label").evaluateAll((labels) =>
      labels.every((label) => label.scrollWidth <= label.clientWidth),
    )).toBe(true);
    await expect(quantity).toHaveValue("3");
    await expect(price).toHaveValue("21");
    await expect(markup).toHaveValue("17");
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$73.71");
    await expectNoHorizontalOverflow(page);
  }
});

test("keeps separate product and license headings complete for long English and Hebrew names", async ({ page }, testInfo) => {
  const names = [
    { product: "Microsoft 365", license: "Business Basic" },
    { product: "Northwind Enterprise Collaboration ".repeat(3).slice(0, 79) + "X", license: "EnterpriseLicense".repeat(10).slice(0, 160) },
    { product: "כלי תוכנה לארגונים ".repeat(6).slice(0, 79) + "א", license: "רישיון מורחב לשיתוף פעולה ".repeat(8).slice(0, 159) + "א" },
  ];
  await page.addInitScript((names) => localStorage.setItem("seatline.quote.v1", JSON.stringify({
    version: 1, sequence: 1, reference: "BALANCED-001", customer: "Long title customer", date: "2026-09-13", notes: "",
    lines: names.map((name, index) => ({ id: `long-${index}`, productId: `product-${index}`, productName: name.product,
      licenseName: name.license, billing: "annual-monthly", quantity: "1", unitPrice: "20", markupPercent: "32" })),
  })), names);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  for (const locale of ["en", "he"]) {
    if (locale === "he") {
      await page.setViewportSize({ width: 320, height: 740 });
      await setTextSize(page, "150");
      await openSettings(page);
      await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("he");
      await closeSettings(page);
    }
    for (const [index, name] of names.entries()) {
      const card = page.getByTestId("quote-line").nth(index);
      const heading = card.getByRole("heading", { level: 2 });
      await expect(heading).toHaveAccessibleName(`${name.product} ${name.license}`);
      await expect(heading).toHaveCSS("text-align", "center");
      const product = await heading.getByText(name.product, { exact: true }).boundingBox();
      const license = await heading.getByText(name.license, { exact: true }).boundingBox();
      if (!product || !license) throw new Error("Complete product and license names must remain in the card");
      expect(product.y + product.height).toBeLessThanOrEqual(license.y);
      expect(await heading.evaluate((element) => {
        const heading = element.getBoundingClientRect();
        const card = element.closest("fieldset")?.getBoundingClientRect();
        if (!card) return false;
        if (Math.abs(heading.x + heading.width / 2 - card.x - card.width / 2) > 1) return false;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const rectangles: DOMRect[] = [];
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          rectangles.push(...Array.from(range.getClientRects()));
        }
        return rectangles.length > 0 && rectangles.every((rectangle) => rectangle.left >= heading.left - 1
          && rectangle.right <= heading.right + 1 && rectangle.top >= heading.top - 1 && rectangle.bottom <= heading.bottom + 1
          && rectangle.left >= card.left && rectangle.right <= card.right);
      }), "Every visible title character must fit inside its heading and quote card").toBe(true);
      const path = testInfo.outputPath(`balanced-title-${locale}-${index}.png`);
      if (locale === "he") {
        const top = await heading.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
        await page.evaluate((top) => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          window.scrollTo({ top: Math.max(0, top - 80), left: 0, behavior: "instant" });
        }, top);
        await page.screenshot({ path });
      } else {
        await card.screenshot({ path });
      }
    }
    await expectNoHorizontalOverflow(page);
    await expect(page.getByLabel(locale === "en" ? "Monthly payments" : "תשלומים חודשיים", { exact: true })).toHaveText("$79.20");
  }
});

test("resizes readable text without losing quote edits and remembers the selection", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("region", { name: "Licenses", exact: true }).getByRole("heading", { name: "Microsoft 365", exact: true });
  const customer = page.getByLabel("Customer", { exact: true });
  await expectTextSize(page, "100");
  await openSettings(page);
  const textSize = page.getByRole("combobox", { name: "Text size", exact: true });
  await expect(page.getByText("Text size", { exact: true })).toBeVisible();
  await expect(textSize.locator("option")).toHaveText(["50%", "60%", "70%", "80%", "90%", "100%", "110%", "120%", "130%", "140%", "150%"]);
  await closeSettings(page);
  const initialHeadingSize = await fontSize(heading);
  const initialInputSize = await fontSize(customer);
  await customer.fill("Display settings customer");
  await page.getByLabel("Sales Proposal", { exact: true }).fill("DISPLAY-001");
  await page.getByRole("button", { name: "Add Business Standard to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Standard", exact: true });
  await line.getByLabel("Quantity", { exact: true }).fill("3");
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("12.50");

  for (const size of [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]) {
    await setTextSize(page, String(size));
    await expectTextSize(page, String(size));
    await expect.poll(async () => (await fontSize(heading)) / initialHeadingSize).toBeCloseTo(size / 100, 2);
    await expect.poll(async () => (await fontSize(customer)) / initialInputSize).toBeCloseTo(size / 100, 2);
    await expectNoHorizontalOverflow(page);
    await expect(customer).toHaveValue("Display settings customer");
    await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$37.50");
    await expect(page.getByRole("button", { name: "Export PDF", exact: true })).toBeEnabled();
  }

  await page.reload();
  await expectTextSize(page, "150");
  await expect.poll(async () => (await fontSize(heading)) / initialHeadingSize).toBeCloseTo(1.5, 2);
  await expect(customer).toHaveValue("Display settings customer");
  await expect(page.getByLabel("Sales Proposal", { exact: true })).toHaveValue("DISPLAY-001");
  await expect(line.getByLabel("Quantity", { exact: true })).toHaveValue("3");
  await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("12.50");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$37.50");
  await expectNoHorizontalOverflow(page);
});

test("keeps New Order confirmation usable at the largest text size", async ({ page }) => {
  await page.goto("/");
  await setTextSize(page, "150");
  await page.getByLabel("Customer", { exact: true }).fill("Keep until confirmed");
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const newOrder = page.getByRole("button", { name: "New Order", exact: true });
  await expect(newOrder).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await newOrder.click();
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Keep until confirmed");
  await expect(page.getByTestId("quote-line")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await newOrder.click();
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("");
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
  await expectTextSize(page, "150");
  await expectNoHorizontalOverflow(page);
  await page.reload();
  await expectTextSize(page, "150");
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
});

for (const preference of [
  { name: "malformed JSON", value: "{invalid" },
  { name: "unsupported text size", value: JSON.stringify({ textSize: 155 }) },
  { name: "invalid preference type", value: JSON.stringify({ textSize: "110" }) },
  { name: "missing preference object", value: "null" },
]) {
  test(`uses the default size after ${preference.name} and still allows resizing`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: displayKey, value: preference.value,
    });
    await page.goto("/");
      const heading = page.getByRole("region", { name: "Licenses", exact: true }).getByRole("heading", { name: "Microsoft 365", exact: true });
    await expectTextSize(page, "100");
    const initialSize = await fontSize(heading);
    await setTextSize(page, "110");
    await expect.poll(async () => (await fontSize(heading)) / initialSize).toBeCloseTo(1.1, 2);
    await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
    await expect(page.getByTestId("quote-line")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  });
}

test("allows resizing and quoting when browser storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "QuotaExceededError"); };
  });
  await page.goto("/");
  const heading = page.getByRole("region", { name: "Licenses", exact: true }).getByRole("heading", { name: "Microsoft 365", exact: true });
  await expectTextSize(page, "100");
  const initialSize = await fontSize(heading);
  await setTextSize(page, "150");
  await expectTextSize(page, "150");
  await expect.poll(async () => (await fontSize(heading)) / initialSize).toBeCloseTo(1.5, 2);
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByLabel("Quantity", { exact: true }).fill("2");
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("15");
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$30.00");
  await expectNoHorizontalOverflow(page);
});
