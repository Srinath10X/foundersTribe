export function encodeCursor(createdAt: string | Date, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString("base64");
}

export function decodeCursor(cursor?: string): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  const [createdAt, id] = decoded.split("|");
  if (!createdAt || !id) return null;
  return { createdAt, id };
}
