import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "./supabase";

export interface AppleSignInResult {
  success: boolean;
  user?: string;
  error?: string;
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return {
        success: false,
        error: "No identity token received from Apple",
      };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });

    if (error) {
      console.error("Supabase signInWithIdToken error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data.user?.id,
    };
  } catch (e) {
    const error = e as Error;
    if (error.message?.includes("canceled")) {
      return {
        success: false,
        error: "Sign in was cancelled",
      };
    }
    console.error("Apple Sign-In error:", error);
    return {
      success: false,
      error: error.message || "Unknown error during Apple Sign-In",
    };
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

export async function signOutApple(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign out error:", error);
  }
}