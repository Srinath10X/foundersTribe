import React, { memo, useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { useInfiniteUsers } from "@/hooks/useInfiniteUsers";
import { PeopleCard, PEOPLE_CARD_HEIGHT, PEOPLE_CARD_WIDTH } from "@/components/PeopleCard";
import { useTheme } from "@/context/ThemeContext";
import type { PeopleUser } from "@/hooks/useInfiniteUsers";

const S = {
  sm: 12,
  lg: 20,
} as const;

const PEOPLE_CARD_SPACING = S.sm;

function PeopleListBase({ limit = 12 }: { limit?: number }) {
  const { theme, isDark } = useTheme();
  const query = useInfiniteUsers(limit);

  const data = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  );

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: PeopleUser }) => <PeopleCard profile={item} />,
    []
  );

  const skeletonBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  if (query.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <View style={styles.skeletonRow}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View
              key={`skeleton-${index}`}
              style={[styles.skeletonCard, { backgroundColor: skeletonBg }]}
            />
          ))}
        </View>
      </View>
    );
  }

  if (query.error) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={[styles.errorText, { color: theme.text.tertiary }]}>Unable to load people.</Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsHorizontalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      getItemLayout={(_, index) => ({
        length: PEOPLE_CARD_WIDTH + PEOPLE_CARD_SPACING,
        offset: (PEOPLE_CARD_WIDTH + PEOPLE_CARD_SPACING) * index,
        index,
      })}
      initialNumToRender={6}
      windowSize={5}
      maxToRenderPerBatch={6}
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={theme.brand.primary} />
          </View>
        ) : null
      }
    />
  );
}

export const PeopleList = memo(PeopleListBase);

const styles = StyleSheet.create({
  listContent: { gap: S.sm, paddingRight: S.lg },
  loadingWrap: { paddingVertical: S.lg },
  footerLoader: { paddingHorizontal: S.lg, justifyContent: "center" },
  errorText: { fontSize: 12, fontFamily: "Poppins_400Regular" },
  skeletonRow: {
    flexDirection: "row",
    gap: PEOPLE_CARD_SPACING,
    paddingRight: S.lg,
  },
  skeletonCard: {
    width: PEOPLE_CARD_WIDTH,
    height: PEOPLE_CARD_HEIGHT,
    borderRadius: 14,
  },
});
