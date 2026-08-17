import { expect, test } from "@playwright/test";

import { TEST_TITLE_PREFIX } from "./global-teardown";

const ADMIN = { email: "admin@verori.com", password: "Admin123!" };
const USER = { email: "user@verori.com", password: "User123!" };

async function signIn(page: import("@playwright/test").Page, account: typeof ADMIN) {
  await page.goto("/auth/sign-in");
  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  await page.click('button[type="submit"]');

  // The server action sets the cookie and redirects. Without waiting for that,
  // the next navigation races it and lands back on the sign-in page.
  await page.waitForURL(/\/(dashboard|admin)/);
}

test("a signed out visitor is sent to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/sign-in/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("a user lands on the dashboard and cannot reach the admin app", async ({ page }) => {
  await signIn(page, USER);
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("an admin lands on the admin app", async ({ page }) => {
  await signIn(page, ADMIN);
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByText("User Management").first()).toBeVisible();
});

test("the auth pages are closed once signed in", async ({ page }) => {
  await signIn(page, USER);
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/auth/sign-in");
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/auth/sign-up");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("the session cookie is httpOnly, so scripts cannot read it", async ({ page, context }) => {
  await signIn(page, USER);
  await expect(page).toHaveURL(/\/dashboard/);

  const cookie = (await context.cookies()).find((item) => item.name === "verori.session");
  expect(cookie, "the session cookie must exist").toBeDefined();
  expect(cookie?.httpOnly, "the session cookie must be httpOnly").toBe(true);

  const readable = await page.evaluate(() => document.cookie);
  expect(readable).not.toContain("verori.session");
});

test("signing out closes the app again", async ({ page }) => {
  await signIn(page, USER);
  await expect(page).toHaveURL(/\/dashboard/);

  // Sign out lives inside the account popover in the sidebar footer.
  await page.getByRole("button", { name: /account menu/i }).click();
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("a user can create an example through the dialog", async ({ page }) => {
  const title = `${TEST_TITLE_PREFIX}${Date.now()}`;

  await signIn(page, USER);
  await page.goto("/dashboard/examples");

  await page.getByRole("button", { name: /new example/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.fill('input[name="title"]', title);
  await page.fill('textarea[name="content"]', "created by the e2e test");
  await page.getByRole("button", { name: /^create$/i }).click();

  // The dialog closes itself once the server confirms the write.
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("cell", { name: title })).toBeVisible();
});

test("deleting asks for confirmation first", async ({ page }) => {
  const title = `${TEST_TITLE_PREFIX}${Date.now()}-delete`;

  await signIn(page, ADMIN);
  await page.goto("/admin/examples");

  await page.getByRole("button", { name: /new example/i }).click();
  await page.fill('input[name="title"]', title);
  await page.getByRole("button", { name: /^create$/i }).click();
  await expect(page.getByRole("cell", { name: title })).toBeVisible();

  await page
    .getByRole("row", { name: new RegExp(title) })
    .getByRole("button", { name: /^delete$/i })
    .click();

  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByText("This cannot be undone.")).toBeVisible();

  await page.getByRole("alertdialog").getByRole("button", { name: /^delete$/i }).click();
  await expect(page.getByRole("cell", { name: title })).toHaveCount(0);
});

test("delete is admin only, so a user never sees the button", async ({ page }) => {
  await signIn(page, USER);
  await page.goto("/dashboard/examples");

  await expect(page.getByRole("button", { name: /^delete$/i })).toHaveCount(0);
});

test("the table pages, searches and sorts through the api", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto("/admin/examples");

  const counter = page.locator('[data-slot="crud-count"]');
  await expect(counter).toContainText("Showing");

  // Sorting and paging are held in the url, so a link stays shareable.
  await page.getByRole("button", { name: /^Title/ }).click();
  await expect(page).toHaveURL(/sort_by=title/);

  await page.fill('input[aria-label="Search"]', "definitely-no-such-row");
  await expect(counter).toContainText("of 0");
  await expect(page.getByText("No examples yet.")).toBeVisible();
});

test("an admin can see and manage users", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto("/admin/users");

  await expect(page.getByRole("cell", { name: USER.email })).toBeVisible();
  await expect(page.getByRole("cell", { name: ADMIN.email })).toBeVisible();
  await expect(page.getByText("This is you")).toBeVisible();
});
