import { supabaseAdmin, getSupabaseForToken } from "../config/supabase.js";

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      error: { code: "unauthorized", message: "Missing bearer token", details: null },
    });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({
      error: { code: "unauthorized", message: "Invalid token", details: null },
    });
  }

  req.user = data.user;
  req.accessToken = token;
  req.db = getSupabaseForToken(token);
  next();
};
