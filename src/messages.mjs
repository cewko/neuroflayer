import { stripVTControlCharacters } from "node:util";

const CONTROL_FORMAT_CHARS = /[\p{Cc}\p{Cf}]/gu;

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function toConsoleLine(value) {
  return stripVTControlCharacters(String(value)).replace(
    CONTROL_FORMAT_CHARS,
    " ",
  );
}

export function validateMessage(message, maxMessageLength) {
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > maxMessageLength ||
    !message.isWellFormed() ||
    message.search(CONTROL_FORMAT_CHARS) !== -1 ||
    message.includes("\u00a7")
  ) {
    throw new Error(
      `use one line of plain text, at most ${maxMessageLength} characters.`,
    );
  }
}

export function validReply(reply, maxMessageLength) {
  if (typeof reply !== "string" || reply.trimStart().startsWith("/"))
    return false;
  try {
    validateMessage(reply, maxMessageLength);
    return reply.length >= 1;
  } catch {
    return false;
  }
}
