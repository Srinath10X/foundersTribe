/**
 * ============================================================
 * AI SERVICE CLIENT
 * ============================================================
 *
 * Thin client that calls the ai-service backend API.
 * All Groq/LLM logic, freelancer pool fetching, and context
 * building now live server-side in services/ai-service.
 *
 * The mobile app only sends the user's message + conversation
 * history and receives a ready-to-render ChatMessage back.
 * ============================================================
 */

import { supabase } from "./supabase";

// ── Configuration ───────────────────────────────────────────

const AI_SERVICE_URL = process.env.EXPO_PUBLIC_AI_SERVICE_URL;

if (!AI_SERVICE_URL) {
  console.warn(
    "EXPO_PUBLIC_AI_SERVICE_URL is not set. AI search will not work.",
  );
}

// ── Types ────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  freelancers?: FreelancerResult[];
  timestamp: number;
};

export type FreelancerResult = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  experience_level: string | null;
  hourly_rate: string | null;
  availability: string | null;
  country: string | null;
  services: {
    name: string;
    cost: string;
    delivery: string;
  }[];
  matchReason: string;
};

// ── Auth Helper ─────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error("Not authenticated");
  }
  return session.access_token;
}

// ── Chat Function ───────────────────────────────────────────

export async function chatWithAI(
  userMessage: string,
  conversationHistory: ChatMessage[],
): Promise<ChatMessage> {
  if (!AI_SERVICE_URL) {
    throw new Error(
      "AI service URL not configured. Set EXPO_PUBLIC_AI_SERVICE_URL in .env",
    );
  }

  const token = await getAuthToken();

  // Build the history payload (only user/assistant messages, content only)
  const history = conversationHistory
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const response = await fetch(`${AI_SERVICE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: userMessage,
      conversation_history: history,
    }),
  });

  if (!response.ok) {
    let errorMessage = `AI service error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // Response is not JSON
    }
    throw new Error(errorMessage);
  }

  const json = await response.json();
  return json.data as ChatMessage;
}

// ── Delete Account ──────────────────────────────────────────

export async function deleteAccount(): Promise<void> {
  if (!AI_SERVICE_URL) {
    throw new Error(
      "AI service URL not configured. Set EXPO_PUBLIC_AI_SERVICE_URL in .env",
    );
  }

  const token = await getAuthToken();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(`${AI_SERVICE_URL}/api/account`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("Request timed out");
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let errorMessage = `Failed to delete account (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // not JSON
    }
    throw new Error(errorMessage);
  }
}

// ── Cache Clear ─────────────────────────────────────────────

export async function clearFreelancerCache(): Promise<void> {
  if (!AI_SERVICE_URL) return;

  try {
    const token = await getAuthToken();
    await fetch(`${AI_SERVICE_URL}/api/ai/clear-cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Silent — cache will expire on its own
  }
}
