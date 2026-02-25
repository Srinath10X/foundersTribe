import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";

const CACHE_PREFIX = "rq-cache:v1";
const CACHE_VERSION = 1;
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const PERSIST_DEBOUNCE_MS = 1200;

type PersistedQueryCacheEnvelope = {
  version: number;
  owner: string;
  savedAt: number;
  state: DehydratedState;
};

const PERSISTED_QUERY_NAMESPACES = new Set([
  "gigs",
  "services",
  "service-requests",
  "proposals",
  "contracts",
  "messages",
  "notifications",
  "profile",
  "ratings",
  "testimonials",
  "tribe-public-profile",
]);

function normalizeOwnerId(ownerId?: string | null) {
  return (ownerId || "anon").trim() || "anon";
}

function buildStorageKey(ownerId?: string | null) {
  return `${CACHE_PREFIX}:${normalizeOwnerId(ownerId)}`;
}

function shouldPersistQuery(query: Query) {
  if (query.state.status !== "success") return false;
  const key = query.queryKey;
  const namespace = Array.isArray(key) ? key[0] : null;
  return typeof namespace === "string" && PERSISTED_QUERY_NAMESPACES.has(namespace);
}

export async function restorePersistedQueryCache(queryClient: QueryClient, ownerId?: string | null) {
  const normalizedOwner = normalizeOwnerId(ownerId);
  const storageKey = buildStorageKey(normalizedOwner);

  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return;

    const parsed = JSON.parse(raw) as PersistedQueryCacheEnvelope | null;
    if (!parsed || parsed.version !== CACHE_VERSION) return;
    if (parsed.owner !== normalizedOwner) return;
    if (!parsed.state) return;

    const age = Date.now() - Number(parsed.savedAt || 0);
    if (Number.isNaN(age) || age > CACHE_MAX_AGE_MS) {
      await AsyncStorage.removeItem(storageKey);
      return;
    }

    hydrate(queryClient, parsed.state);
  } catch {
    // Ignore cache restore errors to avoid blocking app startup.
  }
}

export function subscribePersistedQueryCache(queryClient: QueryClient, ownerId?: string | null) {
  const normalizedOwner = normalizeOwnerId(ownerId);
  const storageKey = buildStorageKey(normalizedOwner);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const persistNow = async () => {
    try {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: shouldPersistQuery,
      });
      const payload: PersistedQueryCacheEnvelope = {
        version: CACHE_VERSION,
        owner: normalizedOwner,
        savedAt: Date.now(),
        state,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore persistence failures; runtime cache still works.
    }
  };

  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      persistNow().catch(() => undefined);
    }, PERSIST_DEBOUNCE_MS);
  });

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}
