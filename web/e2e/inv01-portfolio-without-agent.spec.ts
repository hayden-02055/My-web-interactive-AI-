import { test, expect } from "@playwright/test";

// SDD-08 DD-39 — INV-01 ("Portfolio works without the Agent") pinned as an
// automated check instead of a manual one, so content/refactor churn can't
// quietly break it. `playwright.config.ts` builds and serves the app under
// test with `NEXT_PUBLIC_API_BASE_URL` set to a domain that can never
// resolve (RFC 2606 `.invalid`), so this is a real unreachable backend, not
// a mocked one.

const SECTION_IDS = ["about", "what-i-build", "how-i-work", "skills", "experience", "contact"];

test("every section is reachable and Contact is visible with no backend reachable", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  for (const id of SECTION_IDS) {
    const section = page.locator(`#${id}`);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
  }

  await expect(page.getByText("Discuss Your Idea")).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("the Agent degrades gracefully instead of breaking the page when unreachable", async ({ page }) => {
  await page.goto("/");
  await page.locator('textarea[placeholder="Ask about my work..."]').fill("hello");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Agent is temporarily unavailable")).toBeVisible({ timeout: 15_000 });

  // The rest of the page must still work while the Agent is degraded.
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.getByText("Discuss Your Idea")).toBeVisible();
});
