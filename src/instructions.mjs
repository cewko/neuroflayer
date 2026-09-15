import { readFileSync } from "node:fs";
import { MAX_MESSAGE_LENGTH } from "./messages.mjs";

const allowed = String.raw`A-Za-z0-9 .,!?;:'"()\x2D`;
export const REPLY_GRAMMAR = `root ::= [A-Za-z0-9] [${allowed}]{0,${MAX_MESSAGE_LENGTH - 2}} [.!?]\n`;
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
    reply.length <= MAX_MESSAGE_LENGTH &&
    !forbidden.test(reply) &&
    /^[A-Za-z0-9]/.test(reply) &&
    /[.!?]$/.test(reply)
  );
}

export function buildMessages({ instructions, question, username }) {
  const context = [
    instructions,
    username ? `You are replying to player ${username}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    {
      role: "user",
      content: context + "\n\nQuestion: " + question.trim(),
    },
  ];
}
