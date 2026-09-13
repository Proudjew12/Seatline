import { expect, test, setEditMode } from "./fixtures";

test("scrolls the tablet catalog from its blank gutter without adding licenses", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "This scenario verifies native tablet scrolling.");
  await page.goto("/");
  await setEditMode(page, true);
  for (let index = 1; index <= 16; index += 1) {
    await page.getByRole("button", { name: "Add license", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add license", exact: true });
    await dialog.getByLabel("License name", { exact: true }).fill(`Tablet license ${index}`);
    await dialog.getByRole("button", { name: "Add license", exact: true }).click();
  }
  const panel = page.getByRole("region", { name: "Licenses", exact: true });
  const scrollCard = page.getByRole("button", { name: "Add Tablet license 8 to quote", exact: true });
  await scrollCard.scrollIntoViewIfNeeded();
  const initialScroll = await panel.evaluate((element) => element.scrollTop);
  expect(await panel.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  const cardBox = await scrollCard.boundingBox();
  const panelBox = await panel.boundingBox();
  if (!cardBox || !panelBox) throw new Error("The catalog gutter must be visible to swipe.");
  const x = (panelBox.x + cardBox.x) / 2;
  // The empty gutter retains native scrolling while the cards themselves drag immediately.
  const direction = initialScroll > 0 ? 1 : -1;
  const startY = cardBox.y + cardBox.height / 2;
  expect(await panel.evaluate((element, point) => document.elementFromPoint(point.x, point.y) === element, { x, y: startY })).toBe(true);
  const session = await context.newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: startY, id: 1 }] });
    for (let step = 1; step <= 12; step += 1) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x, y: startY + direction * step * 15, id: 1 }],
      });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally {
    await session.detach();
  }
  await expect.poll(() => panel.evaluate((element) => element.scrollTop)).not.toBe(initialScroll);
  await expect(page.getByTestId("quote-line")).toHaveCount(0);
});
