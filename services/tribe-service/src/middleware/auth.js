import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

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
    logger.debug({ userId: data.user.id }, "Socket authenticated");
    next();
  } catch (err) {
    logger.warn({ err }, "Socket auth failed");
    next(new Error("Authentication failed"));
  }
};
