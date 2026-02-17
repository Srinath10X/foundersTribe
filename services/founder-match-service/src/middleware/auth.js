import { supabase } from "../config/supabase.js";

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ error: "No token" });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = data.user;
  next();
};

export const socketAuthMiddleware = async (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return next(new Error("Invalid token"));
    }

    socket.data.user = data.user;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
};

