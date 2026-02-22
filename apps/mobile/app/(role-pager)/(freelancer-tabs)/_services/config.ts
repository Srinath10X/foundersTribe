// ─────────────────────────────────────────────────────────────────────────────
// Freelancer Tabs — Service Configuration
// Toggle USE_MOCK to false when the gig-marketplace-service backend is running.
// ─────────────────────────────────────────────────────────────────────────────

/** When true, service methods return mock data with simulated delay. */
export const USE_MOCK = true;

/** Base URL for the gig-marketplace-service API. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_GIG_SERVICE_URL ?? "http://localhost:3005";

/** Simulated network delay range (ms) for mock responses. */
const MOCK_DELAY_MIN = 300;
const MOCK_DELAY_MAX = 500;

/** Default page size for cursor-based pagination. */
export const DEFAULT_PAGE_SIZE = 20;

/** Returns a promise that resolves after a random delay between 300–500ms. */
export function mockDelay(): Promise<void> {
  const ms =
    Math.floor(Math.random() * (MOCK_DELAY_MAX - MOCK_DELAY_MIN + 1)) +
    MOCK_DELAY_MIN;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
