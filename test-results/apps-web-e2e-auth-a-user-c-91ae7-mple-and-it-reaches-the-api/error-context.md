# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps/web/e2e/auth.spec.ts >> a user can create an example and it reaches the api
- Location: apps/web/e2e/auth.spec.ts:69:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/auth/sign-in", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const ADMIN = { email: "admin@verori.com", password: "Admin123!" };
  4  | const USER = { email: "user@verori.com", password: "User123!" };
  5  | 
  6  | async function signIn(page: import("@playwright/test").Page, account: typeof ADMIN) {
> 7  |   await page.goto("/auth/sign-in");
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  8  |   await page.fill('input[name="email"]', account.email);
  9  |   await page.fill('input[name="password"]', account.password);
  10 |   await page.click('button[type="submit"]');
  11 | }
  12 | 
  13 | test("a signed out visitor is sent to sign in", async ({ page }) => {
  14 |   await page.goto("/dashboard");
  15 |   await expect(page).toHaveURL(/\/auth\/sign-in/);
  16 | 
  17 |   await page.goto("/admin");
  18 |   await expect(page).toHaveURL(/\/auth\/sign-in/);
  19 | });
  20 | 
  21 | test("a user lands on the dashboard and cannot reach the admin app", async ({ page }) => {
  22 |   await signIn(page, USER);
  23 |   await expect(page).toHaveURL(/\/dashboard/);
  24 | 
  25 |   await page.goto("/admin");
  26 |   await expect(page).toHaveURL(/\/dashboard/);
  27 | });
  28 | 
  29 | test("an admin lands on the admin app", async ({ page }) => {
  30 |   await signIn(page, ADMIN);
  31 |   await expect(page).toHaveURL(/\/admin/);
  32 |   await expect(page.getByText("User Management").first()).toBeVisible();
  33 | });
  34 | 
  35 | test("the auth pages are closed once signed in", async ({ page }) => {
  36 |   await signIn(page, USER);
  37 |   await expect(page).toHaveURL(/\/dashboard/);
  38 | 
  39 |   await page.goto("/auth/sign-in");
  40 |   await expect(page).toHaveURL(/\/dashboard/);
  41 | 
  42 |   await page.goto("/auth/sign-up");
  43 |   await expect(page).toHaveURL(/\/dashboard/);
  44 | });
  45 | 
  46 | test("the session cookie is httpOnly, so scripts cannot read it", async ({ page, context }) => {
  47 |   await signIn(page, USER);
  48 |   await expect(page).toHaveURL(/\/dashboard/);
  49 | 
  50 |   const cookie = (await context.cookies()).find((item) => item.name === "verori.session");
  51 |   expect(cookie, "the session cookie must exist").toBeDefined();
  52 |   expect(cookie?.httpOnly, "the session cookie must be httpOnly").toBe(true);
  53 | 
  54 |   const readable = await page.evaluate(() => document.cookie);
  55 |   expect(readable).not.toContain("verori.session");
  56 | });
  57 | 
  58 | test("signing out closes the app again", async ({ page }) => {
  59 |   await signIn(page, USER);
  60 |   await expect(page).toHaveURL(/\/dashboard/);
  61 | 
  62 |   await page.getByRole("button", { name: /sign out/i }).click();
  63 |   await expect(page).toHaveURL(/\/auth\/sign-in/);
  64 | 
  65 |   await page.goto("/dashboard");
  66 |   await expect(page).toHaveURL(/\/auth\/sign-in/);
  67 | });
  68 | 
  69 | test("a user can create an example and it reaches the api", async ({ page }) => {
  70 |   const title = `e2e-${Date.now()}`;
  71 | 
  72 |   await signIn(page, USER);
  73 |   await page.goto("/dashboard/examples");
  74 | 
  75 |   await page.fill('input[name="title"]', title);
  76 |   await page.fill('input[name="content"]', "created by the e2e test");
  77 |   await page.getByRole("button", { name: /create example/i }).click();
  78 | 
  79 |   await expect(page.getByText(title)).toBeVisible();
  80 | });
  81 | 
  82 | test("delete is admin only, so a user never sees the button", async ({ page }) => {
  83 |   await signIn(page, USER);
  84 |   await page.goto("/dashboard/examples");
  85 | 
  86 |   await expect(page.getByRole("button", { name: /^delete$/i })).toHaveCount(0);
  87 | });
  88 | 
  89 | test("an admin can see and manage users", async ({ page }) => {
  90 |   await signIn(page, ADMIN);
  91 |   await page.goto("/admin/users");
  92 | 
  93 |   await expect(page.getByText(USER.email)).toBeVisible();
  94 |   await expect(page.getByText(ADMIN.email)).toBeVisible();
  95 |   await expect(page.getByText("This is you")).toBeVisible();
  96 | });
  97 | 
```