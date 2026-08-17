import createClient from "openapi-fetch";

import type { paths } from "@/generated/api-types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

/** Typed client. Every path and body is checked against the Rust OpenAPI spec. */
export const apiClient = createClient<paths>({ baseUrl: API_BASE_URL });
