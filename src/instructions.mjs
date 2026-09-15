import { readFileSync } from "node:fs";

const allowed = String.raw`A-Za-z0-9 .,!?;:'"()\x2D`;
export const REPLY_GRAMMAR = `root ::= [A-Za-z0-9] [${allowed}]{0,254} [.!?]\n`;
const forbidden = new RegExp(`[^${allowed}]`, "u");

export function loadReplyInstructions(path) {
  const prompt = readFileSync(path, "utf8").trim();
  if (!prompt) throw new Error("prompt cannot be empty");
  return prompt;
}

export function validReply(reply) {
  return (
    typeof reply === "string" &&
    reply.length >= 2 &&
    reply.length <= 256 &&
    !forbidden.test(reply) &&
    /^[A-Za-z0-9]/.test(reply) &&
    /[.!?]$/.test(reply)
  );
}
