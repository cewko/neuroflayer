import { readFileSync } from "node:fs";
import { MAX_MESSAGE_LENGTH } from "./messages.mjs";

const allowed = String.raw`A-Za-z0-9 .,!?;:'"()\x2D`;
export const REPLY_GRAMMAR = `root ::= [A-Za-z0-9] [${allowed}]{1,${MAX_MESSAGE_LENGTH - 1}}\n`;

export function loadReplyInstructions(path) {
  const prompt = readFileSync(path, "utf8").trim();
  if (!prompt) throw new Error("prompt cannot be empty");
  return prompt;
}

export function validReply(reply) {
  return (
    typeof reply === "string" &&
    reply.length >= 2 &&
    reply.length <= MAX_MESSAGE_LENGTH
  );
}

export function buildMessages({
  instructions,
  question,
  username,
  botName,
  history = [],
}) {
  const transcript = history
    .map(({ speaker, kind, message }) => `${kind} ${speaker}: ${message}`)
    .join("\n");

  const context = [
    botName && `your name is "${botName}".`,
    username && `you are speaking with "${username}".`,
    transcript && `recent public conversation:\n${transcript}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const selectedMessage = username
    ? `${username}: ${question.trim()}`
    : question.trim();

  return [
    {
      role: "user",
      content: `${instructions}
      ${context}
      respond to this message using the conversation above as context:
      ${selectedMessage}`.trim(),
    },
  ];
}
