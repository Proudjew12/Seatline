import { readFile } from "node:fs/promises";

import type { Locator, Page, TestInfo } from "@playwright/test";

import { expect, test } from "./fixtures";

const reference = "SP-LOGI-001";

async function prepareQuote(page: Page): Promise<Locator> {
  await page.goto("/");
  await page.getByLabel("Customer", { exact: true }).fill("Logi quotation customer");
  await page.getByLabel("Sales Proposal", { exact: true }).fill(reference);
  await page.getByRole("button", { name: "Add Business Basic to quote", exact: true }).press("Enter");
  const line = page.getByRole("group", { name: "Business Basic", exact: true });
  await line.getByLabel("Quantity", { exact: true }).fill("2");
  await line.getByRole("textbox", { name: "Price", exact: true }).fill("15.50");
  return line;
}

async function downloadQuote(page: Page, testInfo: TestInfo): Promise<Buffer> {
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe(`Logi-${reference}.pdf`);
  expect(await download.failure()).toBeNull();
  const path = testInfo.outputPath("logi-quotation.pdf");
  await download.saveAs(path);
  const pdf = await readFile(path);
  expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(pdf.subarray(-1024).toString("ascii")).toContain("%%EOF");
  return pdf;
}

test("downloads a customer quotation with Logi document branding and reference", async ({ page }, testInfo) => {
  await prepareQuote(page);
  const pdf = await downloadQuote(page, testInfo);
  const metadata = pdf.toString("latin1");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(metadata).toMatch(/\/Author\s*\(Logi\)/);
  expect(metadata).toMatch(/\/Title\s*\(Software License Quotation SP-LOGI-001\)/);
  await expect(page.getByLabel("Monthly payments", { exact: true })).toHaveText("$31.00");
});

for (const asset of [
  { name: "logo image", path: "**/branding/logi-logo.png", contentType: "image/png", body: "invalid PNG image" },
  { name: "bold font", path: "**/fonts/DejaVuSans-Bold.ttf", contentType: "application/octet-stream", body: "invalid bold font" },
]) {
  test(`keeps the quotation after an invalid ${asset.name} and downloads successfully on retry`, async ({ page }, testInfo) => {
    await page.route(asset.path, (route) => route.fulfill({ status: 200, contentType: asset.contentType, body: asset.body }));
    const line = await prepareQuote(page);
    const exportButton = page.getByRole("button", { name: "Export PDF", exact: true });
    const downloads: string[] = [];
    page.on("download", (download) => downloads.push(download.suggestedFilename()));
    await exportButton.click();
    await expect(page.getByRole("alert")).toContainText("The PDF could not be created.");
    await expect(exportButton).toBeEnabled();
    await expect(page.getByLabel("Customer", { exact: true })).toHaveValue("Logi quotation customer");
    await expect(page.getByLabel("Sales Proposal", { exact: true })).toHaveValue(reference);
    await expect(line.getByLabel("Quantity", { exact: true })).toHaveValue("2");
    await expect(line.getByRole("textbox", { name: "Price", exact: true })).toHaveValue("15.50");
    expect(downloads).toEqual([]);
    await page.unroute(asset.path);
    await downloadQuote(page, testInfo);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(downloads).toEqual([`Logi-${reference}.pdf`]);
  });
}
