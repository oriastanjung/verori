import "server-only";

import createClient, { type Middleware } from "openapi-fetch";

import type { paths } from "@/generated/api-types";
import { API_BASE_URL, getSessionToken } from "@/lib/session";

/**
 * Attaches the session token as a bearer header. The token comes from the
 * httpOnly cookie, so browser JavaScript never sees it.
 */
const attachSession: Middleware = {
  async onRequest({ request }) {
    const token = await getSessionToken();
    if (token) {
      request.headers.set("authorization", `Bearer ${token}`);
    }
    return request;
  },
};

/** Typed client. Every path and body is checked against the Rust OpenAPI spec. */
export const apiClient = createClient<paths>({ baseUrl: API_BASE_URL });

apiClient.use(attachSession);
