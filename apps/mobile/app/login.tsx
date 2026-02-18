/**
 * AUTHENTICATION (RESTORED)
 * Friendly, Social, Standard.
 */

import { Colors, Layout, Spacing } from "@/constants/DesignSystem";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

// Completes the OAuth flow on web
WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [isLogin, setIsLogin] = useState(true); // Toggle logic
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const performOAuth = async () => {
    setLoading(true);
    setErrorMsg("");
    const redirectUrl = Linking.createURL("/");

    try {
      if (Platform.OS === "web") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
          },
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) throw error;

        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl,
          );
          if (result.type === "success" && result.url) {
            const url = new URL(result.url);

            // Handle implicit flow (tokens in hash)
            if (url.hash) {
              const params = new URLSearchParams(url.hash.replace("#", ""));
              const access_token = params.get("access_token");
              const refresh_token = params.get("refresh_token");

              if (access_token && refresh_token) {
                const { error } = await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });
                if (error) throw error;
                // Give AuthContext time to update, then navigate
                setTimeout(() => {
                  router.replace("/home");
                }, 100);
                console.log("Session set via implicit flow");
                return; // Success
              }
            }

            // Handle PKCE flow (code in query)
            const code = url.searchParams.get("code");
            if (code) {
              const { error } =
                await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              console.log("Session set via PKCE flow");
              return; // Success
            }
          }
        }
      }
    } catch (e: any) {
      setErrorMsg(
        `Error: ${e.message}\n\nRedirect URL used:\n${redirectUrl}\n\nPlease add this URL to your Supabase Auth Redirect URLs.`,
      );
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Navigation handled by onAuthStateChange in _layout,
        // but explicit redirect is faster for UX
        
        router.replace("/home");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
            },
          },
        });
        if (error) throw error;
        else setErrorMsg("Check your email for confirmation!");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Premium background */}
      <View
        style={[styles.gradientBg, { backgroundColor: theme.background }]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.responsiveContainer}>
            {/* Logo/Branding Section */}
            <Animated.View
              entering={FadeInUp.delay(100).duration(800)}
              style={styles.brandSection}
            >
              <Text style={[styles.logo, { color: theme.brand.primary }]}>
                foundersTribe
              </Text>
              <Text style={[styles.tagline, { color: theme.text.tertiary }]}>
                Your premium news experience
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(200).duration(800)}
              style={styles.header}
            >
              <Text style={[styles.title, { color: theme.text.primary }]}>
                {isLogin ? "Welcome Back" : "Create Account"}
              </Text>
              <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                {isLogin ? (
                  "Sign in to continue reading."
                ) : (
                  <Text>
                    Join{" "}
                    <Text style={{ fontFamily: "BricolageGrotesque_700Bold" }}>
                      foundersTribe
                    </Text>{" "}
                    today.
                  </Text>
                )}
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(400).duration(800)}
              style={styles.form}
            >
              {/* Social Buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={[
                    styles.socialBtn,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={performOAuth}
                  disabled={loading}
                >
                  <Ionicons
                    name="logo-google"
                    size={24}
                    color={theme.text.primary}
                  />
                  <Text
                    style={[styles.socialText, { color: theme.text.primary }]}
                  >
                    Continue with Google
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View
                  style={[styles.line, { backgroundColor: theme.border }]}
                />
                <Text style={[styles.dividerText, { color: theme.text.muted }]}>
                  OR EMAIL
                </Text>
                <View
                  style={[styles.line, { backgroundColor: theme.border }]}
                />
              </View>

              <View style={styles.inputs}>
                {!isLogin && (
                  <>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          color: theme.text.primary,
                        },
                      ]}
                      placeholder="Full Name"
                      placeholderTextColor={theme.text.tertiary}
                      value={fullName}
                      onChangeText={setFullName}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          color: theme.text.primary,
                        },
                      ]}
                      placeholder="Phone Number"
                      placeholderTextColor={theme.text.tertiary}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </>
                )}
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text.primary,
                    },
                  ]}
                  placeholder="Email Address"
                  placeholderTextColor={theme.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text.primary,
                    },
                  ]}
                  placeholder="Password"
                  placeholderTextColor={theme.text.tertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {isLogin && (
                <TouchableOpacity>
                  <Text
                    style={[styles.forgotText, { color: theme.brand.primary }]}
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}

              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.brand.primary },
                ]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: theme.text.inverse },
                    ]}
                  >
                    {isLogin ? "Sign In" : "Sign Up"}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text
                  style={[styles.footerText, { color: theme.text.secondary }]}
                >
                  {isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}
                </Text>
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                  <Text
                    style={[styles.linkText, { color: theme.brand.primary }]}
                  >
                    {isLogin ? "Sign Up" : "Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    // Subtle gradient for depth
    opacity: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: Spacing.xxxxxl,
    paddingBottom: 100,
  },
  responsiveContainer: {
    width: "100%",
    maxWidth: 440, // Slightly wider for better web experience
    paddingHorizontal: Spacing.xl,
    ...Platform.select({
      web: {
        paddingHorizontal: Spacing.xxl,
      },
    }),
  },
  brandSection: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  logo: {
    fontSize: 32,
    fontFamily: "BricolageGrotesque_700Bold",
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  form: {
    gap: Spacing.lg,
  },
  socialRow: {
    marginBottom: Spacing.sm,
  },
  socialBtn: {
    height: 56,
    borderRadius: Layout.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    borderWidth: 1,
  },
  socialText: {
    fontWeight: "600",
    fontSize: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  inputs: {
    gap: Spacing.md,
  },
  logoText: {
    fontSize: 28,
    letterSpacing: -1,
    fontFamily: "BricolageGrotesque_700Bold",
  },
  input: {
    height: 54,
    borderRadius: Layout.radius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
  forgotText: {
    alignSelf: "flex-end",
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: Colors.error,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  actionBtn: {
    height: 54,
    borderRadius: Layout.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  actionBtnText: {
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.md,
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontWeight: "700",
    fontSize: 15,
  },
});
