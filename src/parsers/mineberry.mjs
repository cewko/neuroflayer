export const name = "mineberry";

const pattern = /^\[[^\]]+\]\s+([^→]+?)\s*→\s*(.+)$/u;

export function parseMessage({ text, position }) {
  if (position !== "chat" && position !== "system") return null;
  if (typeof text !== "string" || /[\r\n]/.test(text)) return null;

  const match = pattern.exec(text.trim());
  if (!match) return null;

  const username = match[1].trim().replace(/^~/, "").trim();
  const message = match[2].trim();

  if (!username || !message) return null;
  return { username, message };
}
