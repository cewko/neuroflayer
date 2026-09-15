import { stripVTControlCharacters } from "node:util";

export const MAX_MESSAGE_LENGTH = 256;
const CONTROL_FORMAT_CHARS = /[\p{Cc}\p{Cf}]/gu;

export function toConsoleLine(value) {
  return stripVTControlCharacters(String(value)).replace(
    CONTROL_FORMAT_CHARS,
    " ",
  );
}

export function validateMessage(message) {
  const invalid =
    typeof message !== "string" ||
    !message.trim() ||
    message.length > MAX_MESSAGE_LENGTH ||
    !message.isWellFormed() ||
    message.search(CONTROL_FORMAT_CHARS) !== -1 ||
    message.includes("\u00a7");

  if (invalid) {
    throw new Error(
      `use one line of plain text, at most ${MAX_MESSAGE_LENGTH} characters.`,
    );
  }
}
