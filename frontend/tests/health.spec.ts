import { expect, test } from "./fixtures";

const healthyResponse = { status: "ok", service: "Test API", version: "1.2.3" };

test("shows loading, then a validated health response without horizontal overflow", async ({ page }) => {
  let releaseResponse = () => {};
  const responseReady = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/health", async (route) => {
    await responseReady;
    await route.fulfill({ json: healthyResponse });
  });

  try {
    await page.goto("/#/status");
    await expect(page).toHaveTitle("Seatline");
    await expect(page.getByRole("banner").getByRole("img", { name: "Seatline", exact: true })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Checking the API" })).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  } finally {
    releaseResponse();
  }

  await expect(page.getByRole("heading", { name: "API connected" })).toBeVisible();
  await expect(page.getByText("Test API version 1.2.3 responded successfully.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test.describe("service failures", () => {
  test.use({ allowHealthRequestFailure: true });

  test("recovers from an unavailable API using the retry button", async ({ page }) => {
    let serviceRecovered = false;
    await page.route("**/api/health", async (route) => {
      await route.fulfill(
        serviceRecovered
          ? { json: healthyResponse }
          : { status: 503, json: { detail: "Private provider diagnostics" } },
      );
    });

    await page.goto("/#/status");
    await expect(page.getByRole("alert")).toContainText("API unavailable");
    await expect(page.getByRole("alert")).toContainText("The API responded, but its health check failed.");
    await expect(page.getByText("Private provider diagnostics")).toHaveCount(0);
    const retry = page.getByRole("button", { name: "Try again" });
    await retry.focus();
    await expect(retry).toBeFocused();
    expect(await retry.evaluate((button) => getComputedStyle(button).outlineStyle)).not.toBe("none");

    serviceRecovered = true;
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "API connected" })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("handles an interrupted network request", async ({ page }) => {
    await page.route("**/api/health", (route) => route.abort("internetdisconnected"));
    await page.goto("/#/status");
    await expect(page.getByRole("alert")).toContainText("The API health check did not complete.");
    await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});

for (const response of [
  { name: "invalid schema", body: JSON.stringify({ status: "ok", service: 123, version: "1" }) },
  { name: "malformed JSON", body: "{invalid" },
]) {
  test(`rejects ${response.name} without leaking the response`, async ({ page }) => {
    await page.route("**/api/health", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: response.body,
    }));
    await page.goto("/#/status");
    await expect(page.getByRole("alert")).toContainText("API unavailable");
    await expect(page.getByRole("heading", { name: "API connected" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled();
    await expect(page.getByText(response.body, { exact: true })).toHaveCount(0);
  });
}

test("supports the keyboard skip link and recovers from an unknown route", async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: healthyResponse }));
  await page.goto("/#/status");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page.getByRole("heading", { name: "API connected" })).toBeVisible();

  await page.goto("/#/missing-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Return home" }).click();
  await expect(page).toHaveURL(/\/#\/$/);
  await expect(page.getByRole("main", { name: "Order", exact: true })).toBeVisible();
});
