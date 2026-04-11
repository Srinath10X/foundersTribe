import { Share } from "react-native";

type ShareableArticle = {
  id: number | string;
  title?: string | null;
  imageUrl?: string | null;
  articleLink?: string | null;
};

const WEBSITE_ARTICLE_BASE_URL = "https://founderstribe.in/article";

const clean = (value?: string | null) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export function buildArticleShareUrl(article: ShareableArticle): string {
  const articleId = encodeURIComponent(String(article.id));
  const params = new URLSearchParams();

  const title = clean(article.title);
  const imageUrl = clean(article.imageUrl);
  const articleLink = clean(article.articleLink);

  if (title) params.set("title", title);
  if (imageUrl) params.set("imageUrl", imageUrl);
  if (articleLink) params.set("articleLink", articleLink);

  const query = params.toString();
  return query
    ? `${WEBSITE_ARTICLE_BASE_URL}/${articleId}?${query}`
    : `${WEBSITE_ARTICLE_BASE_URL}/${articleId}`;
}

export async function shareArticle(article: ShareableArticle): Promise<void> {
  const shareUrl = buildArticleShareUrl(article);

  await Share.share({
    message: shareUrl,
    title: article.title ? `Read: ${article.title}` : "Read on FoundersTribe",
    url: shareUrl,
  });
}
