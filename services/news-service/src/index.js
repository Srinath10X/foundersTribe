import express from "express";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("❌ Missing environment variables:", missing);
  process.exit(1);
}

const app = express();
app.use(express.json());
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ error: "No token" });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = data.user;
  next();
};

app.get("/ping", authenticate, async (req, res) => {
  console.log("user authenticated");
  res.json({ message: "pong", user: req.user });
});

app.get("/api/get_all_categories", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("category_name, image_url")
      .order("category_name");
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/user_categories", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_interests")
      .select("category")
      .eq("user_id", req.user.id);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user_categories", authenticate, async (req, res) => {
  const { user_id, categories } = req.body;

  if (!user_id || !categories || !Array.isArray(categories)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const deleteResult = await supabase
      .from("user_interests")
      .delete()
      .eq("user_id", user_id);

    if (deleteResult.error) {
      console.log("deleteResult error", deleteResult.error);
      throw deleteResult.error;
    }

    const interestsData = categories.map((cat) => ({
      user_id: user_id,
      category: cat,
    }));

    const insertResult = await supabase
      .from("user_interests")
      .insert(interestsData);

    if (insertResult.error) {
      console.log("insertResult error", insertResult.error);
      throw insertResult.error;
    }

    res.json({ message: "Interests updated successfully" });
  } catch (error) {
    console.error("Error saving interests:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/personalized_articles", authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // 1. Get user interests
    const { data: interestData, error: interestError } = await supabase
      .from("user_interests")
      .select("category")
      .eq("user_id", req.user.id);

    if (interestError) throw interestError;

    const interests = interestData?.map((i) => i.category) || [];

    // 2. Query Articles, filter by Category if interests exist
    let query = supabase
      .from("Articles")
      .select("*");

    if (interests.length > 0) {
      query = query.in("Category", interests);
    }

    // Instead of ordering by strict ID descending and paginating,
    // we fetch a larger pool of recent articles so we can shuffle them.
    // We grab the last 200 possible matches, then randomly pick 'limit' amount.
    const { data: recentPool, error } = await query
      .order("id", { ascending: false })
      .limit(200);

    if (error) throw error;

    if (!recentPool || recentPool.length === 0) {
      return res.json([]);
    }

    // Randomly shuffle the recent pool of articles
    // Fisher-Yates shuffle algorithm
    for (let i = recentPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [recentPool[i], recentPool[j]] = [recentPool[j], recentPool[i]];
    }
    
    // Pick the selected amount
    const randomizedData = recentPool.slice(0, limit);

    res.json(randomizedData);
  } catch (error) {
    console.error("Feed error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/search_articles", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .ilike("title", `%${req.query.search}%`);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/article_by_id", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", req.query.article_id);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/user_liked_articles", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_interactions")
      .select("*")
      .eq("user_id", req.user.id)
      .eq("liked", true);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/user_bookmarked_articles", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_interactions")
      .select("*")
      .eq("user_id", req.user.id)
      .eq("bookmarked", true);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/data/category", authenticate, async (req, res) => {
  const category = req.query.category;

  try {
    const { data, error } = await supabase
      .from("category")
      .select("*")
      .eq("category", category)
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user_bookmarked_articles", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_interactions")
      .upsert(
        {
          user_id: req.user.id,
          article_id: req.body.article_id,
          bookmarked: req.body.bookmarked,
        },
        { onConflict: "user_id,article_id" },
      )
      .select();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user_liked_articles", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_interactions")
      .upsert(
        {
          user_id: req.user.id,
          article_id: req.body.article_id,
          liked: req.body.liked,
        },
        { onConflict: "user_id,article_id" },
      )
      .select();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
