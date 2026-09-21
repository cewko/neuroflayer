import { readFileSync } from "node:fs";

export { validReply } from "./messages.mjs";

const allowed =
  String.raw`A-Za-z0-9 !"#$%&'()*+,\-./:;<=>?@\[\]\\^_` +
  "`" +
  String.raw`{|}~`;

export function createReplyGrammar(maxMessageLength) {
  return `root ::= [A-Za-z0-9] [${allowed}]{1,${maxMessageLength - 1}}\n`;
}

export function loadReplyInstructions(path) {
  const instructions = readFileSync(path, "utf8").trim();
  if (!instructions) throw new Error("prompt cannot be empty");
  return instructions;
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
