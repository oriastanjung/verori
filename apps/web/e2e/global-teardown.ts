/**
 * Removes the records the tests created, so running them repeatedly does not
 * fill the database with leftovers. Runs even when a test fails.
 */

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001";
const WEB_ORIGIN = process.env.E2E_WEB_URL ?? "http://localhost:3000";

/** Everything the tests create is named with this prefix. */
export const TEST_TITLE_PREFIX = "e2e-";

const ADMIN = { email: "admin@verori.com", password: "Admin123!" };

type Example = { id: number; title: string };

async function signInAsAdmin(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: WEB_ORIGIN },
    body: JSON.stringify(ADMIN),
  });

  if (!response.ok) {
    throw new Error(`could not sign in to clean up: ${response.status}`);
  }

  const body = (await response.json()) as { token: string };
  return body.token;
}

export default async function globalTeardown(): Promise<void> {
  let token: string;

  try {
    token = await signInAsAdmin();
  } catch (error) {
    console.warn(`[teardown] skipped: ${(error as Error).message}`);
    return;
  }

  const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };

  const listed = await fetch(`${API_BASE_URL}/api/examples`, { headers });
  if (!listed.ok) {
    console.warn(`[teardown] could not list examples: ${listed.status}`);
    return;
  }

  const examples = (await listed.json()) as Example[];
  const ids = examples
    .filter((example) => example.title.startsWith(TEST_TITLE_PREFIX))
    .map((example) => example.id);

  if (ids.length === 0) {
    console.log("[teardown] nothing to clean up");
    return;
  }

  // Bulk delete is admin only, which is why this signs in as the admin.
  const removed = await fetch(`${API_BASE_URL}/api/examples/bulk-delete`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ids }),
  });

  if (!removed.ok) {
    console.warn(`[teardown] delete failed: ${removed.status}`);
    return;
  }

  const result = (await removed.json()) as { affected: number };
  console.log(`[teardown] removed ${result.affected} test example(s)`);
}
