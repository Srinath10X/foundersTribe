import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";

const NEWS_SERVICE_URL =
  process.env.EXPO_PUBLIC_NEWS_SERVICE_URL || "http://192.168.0.19:3001";

interface ArticleInteraction {
  liked: boolean;
  bookmarked: boolean;
}

const INTERACTION_SYNC_EVENT = "ARTICLE_INTERACTION_SYNC";

export function useArticleInteractions(articleId: number) {
  const [interaction, setInteraction] = useState<ArticleInteraction>({
    liked: false,
    bookmarked: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchInteraction = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_interactions")
        .select("liked, bookmarked")
        .eq("user_id", user.id)
        .eq("article_id", articleId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching interaction:", error);
        return;
      }

      if (data) {
        setInteraction(data);
      } else {
        setInteraction({
          liked: false,
          bookmarked: false,
        });
      }
    } catch (error) {
      console.error("Error in fetchInteraction:", error);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  // 2. Realtime Subscription & Local Event Sync
  useEffect(() => {
    let channel: any;

    // Local listener for instant tab-to-tab sync
    const localSubscription = DeviceEventEmitter.addListener(
      INTERACTION_SYNC_EVENT,
      (payload: {
        articleId: number;
        updates: Partial<ArticleInteraction>;
      }) => {
        if (payload.articleId === articleId) {
          console.log("DEBUG: Local sync received for article", articleId);
          setInteraction((prev) => ({ ...prev, ...payload.updates }));
        }
      }
    );

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`article_interactions_${articleId}_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_interactions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            if (payload.new && payload.new.article_id === articleId) {
              console.log(
                "REALTIME: Remote update received for article",
                articleId
              );
              setInteraction({
                liked: payload.new.liked,
                bookmarked: payload.new.bookmarked,
              });
            }
          }
        )
        .subscribe();
    };

    fetchInteraction();
    setupSubscription();

    return () => {
      localSubscription.remove();
      if (channel) supabase.removeChannel(channel);
    };
  }, [articleId, fetchInteraction]);

  // 3. Focus-sync as a fallback
  useFocusEffect(
    useCallback(() => {
      fetchInteraction();
    }, [fetchInteraction])
  );

  const toggleLike = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        alert("Please log in to like articles");
        return;
      }

      const newLiked = !interaction.liked;

      // OPTIMISTIC LOCAL UPDATE & SYNC
      setInteraction((prev) => ({ ...prev, liked: newLiked }));
      DeviceEventEmitter.emit(INTERACTION_SYNC_EVENT, {
        articleId,
        updates: { liked: newLiked },
      });

      const resp = await fetch(
        `${NEWS_SERVICE_URL}/api/user_liked_articles`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            article_id: articleId,
            liked: newLiked,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }
    } catch (error: any) {
      // Rollback optimistic update
      setInteraction((prev) => ({ ...prev, liked: !prev.liked }));
      DeviceEventEmitter.emit(INTERACTION_SYNC_EVENT, {
        articleId,
        updates: { liked: interaction.liked },
      });
      console.error("Error toggling like:", error);
      alert(`Could not save like: ${error.message || "Unknown error"}`);
    }
  };

  const toggleBookmark = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const newBookmarked = !interaction.bookmarked;

      // OPTIMISTIC LOCAL UPDATE & SYNC
      setInteraction((prev) => ({ ...prev, bookmarked: newBookmarked }));
      DeviceEventEmitter.emit(INTERACTION_SYNC_EVENT, {
        articleId,
        updates: { bookmarked: newBookmarked },
      });

      const resp = await fetch(
        `${NEWS_SERVICE_URL}/api/user_bookmarked_articles`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            article_id: articleId,
            bookmarked: newBookmarked,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }
    } catch (error: any) {
      // Rollback optimistic update
      setInteraction((prev) => ({ ...prev, bookmarked: !prev.bookmarked }));
      DeviceEventEmitter.emit(INTERACTION_SYNC_EVENT, {
        articleId,
        updates: { bookmarked: interaction.bookmarked },
      });
      console.error("Error toggling bookmark:", error);
      alert(`Could not save bookmark: ${error.message || "Unknown error"}`);
    }
  };

  return {
    ...interaction,
    loading,
    toggleLike,
    toggleBookmark,
  };
}
