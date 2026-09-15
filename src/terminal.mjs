import readline from "node:readline";
import { stripVTControlCharacters } from "node:util";

export function openTerminal({ onLine, onClose, nickname }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${nickname}> `,
    historySize: 0,
    crlfDelay: Infinity,
  });

  let closed = false;

  function log(value) {
    const text = stripVTControlCharacters(String(value)).replace(
      /[\p{Cc}\p{Cf}]/gu,
      " ",
    );

    if (!closed && process.stdout.isTTY) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
    }

    process.stdout.write(text + "\n");
    if (!closed) rl.prompt(true);
  }

  rl.on("line", async (line) => {
    if (!closed) rl.prompt();

    try {
      await onLine(line.trim());
    } catch (error) {
      log(error.message);
    }
    if (!closed) rl.prompt();
  });

  rl.on("SIGINT", onClose);
  rl.on("close", () => {
    closed = true;
    onClose();
  });

  rl.prompt();
  return { log, close: () => rl.close() };
}
