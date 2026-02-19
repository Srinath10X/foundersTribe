import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const livekitWsUrl = env.LIVEKIT_URL;

export const roomServiceClient = new RoomServiceClient(
  env.LIVEKIT_URL.replace("ws://", "http://").replace("wss://", "https://"),
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET,
);

export async function generateLiveKitToken(userId, roomId, grants) {
  logger.info(
    {
      apiKeyLength: env.LIVEKIT_API_KEY?.length,
      apiSecretLength: env.LIVEKIT_API_SECRET?.length,
    },
    "Generating LiveKit token",
  );

  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: userId,
    ttl: "6h",
  });

  token.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: grants.canPublish,
    canSubscribe: grants.canSubscribe,
    canPublishData: true,
  });

  return await token.toJwt();
}
