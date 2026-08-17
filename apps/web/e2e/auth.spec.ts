import { expect, test } from "@playwright/test";

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

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("a user can create an example and it reaches the api", async ({ page }) => {
  const title = `e2e-${Date.now()}`;

  await signIn(page, USER);
  await page.goto("/dashboard/examples");

  await page.fill('input[name="title"]', title);
  await page.fill('input[name="content"]', "created by the e2e test");
  await page.getByRole("button", { name: /create example/i }).click();

  // The title also shows up in the success message, so assert on the table row.
  await expect(page.getByRole("cell", { name: title })).toBeVisible();
});

test("delete is admin only, so a user never sees the button", async ({ page }) => {
  await signIn(page, USER);
  await page.goto("/dashboard/examples");

  await expect(page.getByRole("button", { name: /^delete$/i })).toHaveCount(0);
});

test("an admin can see and manage users", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto("/admin/users");

  await expect(page.getByText(USER.email)).toBeVisible();
  await expect(page.getByText(ADMIN.email)).toBeVisible();
  await expect(page.getByText("This is you")).toBeVisible();
});
