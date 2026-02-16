import { useAuth } from "@/context/AuthContext";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.76:3001";

interface ArticleInteraction {
  liked: boolean;
  bookmarked: boolean;
}

const INTERACTION_SYNC_EVENT = "ARTICLE_INTERACTION_SYNC";

export function useArticleInteractions(articleId: number) {
  const { session } = useAuth();
  const authToken = session?.access_token;
  const userId = session?.user?.id;

  const [interaction, setInteraction] = useState<ArticleInteraction>({
    liked: false,
    bookmarked: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchInteraction = useCallback(async () => {
    if (!authToken || !userId) return;

    try {
      // Fetch liked status
      const [likedRes, bookmarkedRes] = await Promise.all([
        fetch(`${API_URL}/api/user_liked_articles`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${API_URL}/api/user_bookmarked_articles`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      let liked = false;
      let bookmarked = false;

      if (likedRes.ok) {
        const likedData = await likedRes.json();
        liked = Array.isArray(likedData)
          ? likedData.some((item: any) => item.article_id === articleId || item.id === articleId)
          : false;
      }

      if (bookmarkedRes.ok) {
        const bookmarkedData = await bookmarkedRes.json();
        bookmarked = Array.isArray(bookmarkedData)
          ? bookmarkedData.some((item: any) => item.article_id === articleId || item.id === articleId)
          : false;
      }

      setInteraction({ liked, bookmarked });
    } catch (error) {
      console.error("Error in fetchInteraction:", error);
    } finally {
      setLoading(false);
    }
  }, [articleId, authToken, userId]);

  // Local event sync for instant tab-to-tab updates
  useEffect(() => {
    const localSubscription = DeviceEventEmitter.addListener(
      INTERACTION_SYNC_EVENT,
      (payload: {
        articleId: number;
        updates: Partial<ArticleInteraction>;
      }) => {
        if (payload.articleId === articleId) {
          setInteraction((prev) => ({ ...prev, ...payload.updates }));
        }
      },
    );

    fetchInteraction();

    return () => {
      localSubscription.remove();
    };
  }, [articleId, fetchInteraction]);

  // Focus-sync as a fallback
  useFocusEffect(
    useCallback(() => {
      fetchInteraction();
    }, [fetchInteraction]),
  );

  const toggleLike = async () => {
    if (!authToken || !userId) {
      alert("Please log in to like articles");
      return;
    }

    try {
      const newLiked = !interaction.liked;

      // OPTIMISTIC LOCAL UPDATE & SYNC
      setInteraction((prev) => ({ ...prev, liked: newLiked }));
      DeviceEventEmitter.emit(INTERACTION_SYNC_EVENT, {
        articleId,
        updates: { liked: newLiked },
      });

      const res = await fetch(`${API_URL}/api/user_liked_articles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          article_id: articleId,
          liked: newLiked,
        }),
      });

      if (!res.ok) {
        // Revert on failure
        setInteraction((prev) => ({ ...prev, liked: !newLiked }));
        DeviceEventEmitter.emit(INTERACTION_SYNC_EVENT, {
          articleId,
          updates: { liked: !newLiked },
        });
        throw new Error(`Failed to toggle like: ${res.status}`);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const toggleBookmark = async () => {
    if (!authToken || !userId) return;

    try {
      const newBookmarked = !interaction.bookmarked;

      // OPTIMISTIC LOCAL UPDATE & SYNC
      setInteraction((prev) => ({ ...prev, bookmarked: newBookmarked }));
      DeviceEventEmitter.emit(INTERACTION_SYNC_EVENT, {
        articleId,
        updates: { bookmarked: newBookmarked },
      });

      const res = await fetch(`${API_URL}/api/user_bookmarked_articles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          article_id: articleId,
          bookmarked: newBookmarked,
        }),
      });

      if (!res.ok) {
        // Revert on failure
        setInteraction((prev) => ({ ...prev, bookmarked: !newBookmarked }));
        DeviceEventEmitter.emit(INTERACTION_SYNC_EVENT, {
          articleId,
          updates: { bookmarked: !newBookmarked },
        });
        throw new Error(`Failed to toggle bookmark: ${res.status}`);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  return {
    ...interaction,
    loading,
    toggleLike,
    toggleBookmark,
  };
}
