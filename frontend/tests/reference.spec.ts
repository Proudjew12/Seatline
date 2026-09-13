import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const legacyReference = "SP-20260905-4A94FD25";

async function loadSavedDraft(page: Page, contents: Record<string, unknown> = {}): Promise<void> {
  await page.goto("/");
  await page.evaluate((draft) => localStorage.setItem("seatline.quote.v1", JSON.stringify(draft)), {
    version: 1, reference: legacyReference, customer: "", notes: "", date: "2026-09-05", lines: [], ...contents,
  });
  await page.reload();
}

test("uses sequential references across reloads, custom edits, and canceled new orders", async ({ page }) => {
  await page.goto("/");
  const reference = page.getByLabel("Sales Proposal", { exact: true });
  const newOrder = page.getByRole("button", { name: "New Order", exact: true });
  await expect(reference).toHaveValue("SP-0001");
  await newOrder.click();
  await expect(reference).toHaveValue("SP-0002");
  await page.reload();
  await expect(reference).toHaveValue("SP-0002");
  await reference.fill("CUSTOM-PO-25");
  await page.reload();
  await expect(reference).toHaveValue("CUSTOM-PO-25");
  page.once("dialog", (dialog) => dialog.dismiss());
  await newOrder.click();
  await expect(reference).toHaveValue("CUSTOM-PO-25");
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("");
  page.once("dialog", (dialog) => dialog.accept());
  await newOrder.click();
  await expect(reference).toHaveValue("SP-0003");
  await page.getByLabel("Customer", { exact: true }).fill("Keep this order until confirmed");
  page.once("dialog", (dialog) => dialog.dismiss());
  await newOrder.click();
  await expect(reference).toHaveValue("SP-0003");
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Keep this order until confirmed");
  await page.reload();
  await expect(reference).toHaveValue("SP-0003");
  page.once("dialog", (dialog) => dialog.accept());
  await newOrder.click();
  await expect(reference).toHaveValue("SP-0004");
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("");
  await newOrder.click();
  await expect(reference).toHaveValue("SP-0005");
});

for (const saved of [
  { name: "customer details", contents: { customer: "Existing customer" } },
  { name: "notes", contents: { notes: "Existing order notes" } },
  { name: "a license line", contents: { lines: [{
    id: "legacy-line", productId: "microsoft-365", productName: "Microsoft 365", licenseName: "Business Basic",
    billing: "annual-monthly", quantity: "2", unitPrice: "15",
  }] } },
]) {
  test(`preserves an old reference on a saved order containing ${saved.name}`, async ({ page }) => {
    await loadSavedDraft(page, saved.contents);
    const reference = page.getByLabel("Sales Proposal", { exact: true });
    await expect(reference).toHaveValue(legacyReference);
    await expect(page.getByRole("alert")).toHaveCount(0);
    if (saved.contents.customer) await expect(page.getByLabel("Customer", { exact: true })).toHaveValue(saved.contents.customer);
    if (saved.contents.notes) await expect(page.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue(saved.contents.notes);
    if (saved.contents.lines) {
      await expect(page.getByTestId("quote-line")).toHaveCount(1);
      await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$30.00");
    }
    await page.reload();
    await expect(reference).toHaveValue(legacyReference);
  });
}

test("simplifies an empty old automatic reference and continues the new sequence", async ({ page }) => {
  await loadSavedDraft(page);
  const reference = page.getByLabel("Sales Proposal", { exact: true });
  await expect(reference).toHaveValue("SP-0001");
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Notes", exact: true })).toHaveValue("");
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
  await page.getByRole("button", { name: "New Order", exact: true }).click();
  await expect(reference).toHaveValue("SP-0002");
  await page.reload();
  await expect(reference).toHaveValue("SP-0002");
});

test("asks before replacing a custom legacy reference on an otherwise empty draft", async ({ page }) => {
  await loadSavedDraft(page, { reference: "SP-0001" });
  const confirmation = page.waitForEvent("dialog");
  const click = page.getByRole("button", { name: "New Order", exact: true }).click();
  await (await confirmation).dismiss();
  await click;
  await expect(page.getByLabel("Sales Proposal", { exact: true })).toHaveValue("SP-0001");
});

test("keeps the full reference number when the sequence exceeds four digits", async ({ page }) => {
  await loadSavedDraft(page, { reference: "SP-9999", sequence: 9999 });
  const reference = page.getByLabel("Sales Proposal", { exact: true });
  await expect(reference).toHaveValue("SP-9999");
  await page.getByRole("button", { name: "New Order", exact: true }).click();
  await expect(reference).toHaveValue("SP-10000");
  await page.reload();
  await expect(reference).toHaveValue("SP-10000");
});

test("keeps the current order when its sequence cannot safely increase", async ({ page }) => {
  const lastReference = `SP-${Number.MAX_SAFE_INTEGER}`;
  await loadSavedDraft(page, { reference: lastReference, sequence: Number.MAX_SAFE_INTEGER });
  const reference = page.getByLabel("Sales Proposal", { exact: true });
  await page.getByRole("button", { name: "New Order", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("The order number cannot be increased. Your current order has been kept.");
  await expect(reference).toHaveValue(lastReference);
  await page.reload();
  await expect(reference).toHaveValue(lastReference);
});

test("recovers from invalid sequence metadata with a warning and a usable reference", async ({ page }) => {
  await loadSavedDraft(page, { reference: "SP-0042", sequence: -1 });
  await expect(page.getByRole("alert")).toContainText("The saved quote could not be read.");
  const reference = page.getByLabel("Sales Proposal", { exact: true });
  await expect(reference).toHaveValue("SP-0001");
  await page.getByRole("button", { name: "New Order", exact: true }).click();
  await expect(reference).toHaveValue("SP-0002");
});

test("increments references for the current visit when browser storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "QuotaExceededError"); };
  });
  await page.goto("/");
  const reference = page.getByLabel("Sales Proposal", { exact: true });
  const newOrder = page.getByRole("button", { name: "New Order", exact: true });
  await expect(reference).toHaveValue("SP-0001");
  await newOrder.click();
  await expect(reference).toHaveValue("SP-0002");
  await reference.fill("VISIT-ONLY");
  page.once("dialog", (dialog) => dialog.accept());
  await newOrder.click();
  await expect(reference).toHaveValue("SP-0003");
});
