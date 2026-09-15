import readline from "node:readline";
import { toConsoleLine } from "./messages.mjs";

export function openTerminal({ onLine, onClose, nickname }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${nickname}> `,
    historySize: 0,
    crlfDelay: Infinity,
  });
  let closed = false;

  function prompt() {
    if (!closed && process.stdin.isTTY) rl.prompt(true);
  }

  function log(value) {
    const text = toConsoleLine(value);

    if (!closed && process.stdout.isTTY) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
    }
    process.stdout.write(text + "\n");
    prompt();
  }

  rl.on("line", async (line) => {
    prompt();
    try {
      await onLine(line.trim());
    } catch (error) {
      if (!closed) log(error.message);
    }
  });
  rl.on("SIGINT", onClose);
  rl.on("close", () => {
    closed = true;
    onClose();
  });

  prompt();
  return { log, close: () => rl.close() };
}
