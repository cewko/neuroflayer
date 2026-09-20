import readline from "node:readline";
import { errorMessage, toConsoleLine } from "./messages.mjs";

export function openTerminal({
  onLine,
  onClose,
  nickname,
  input = process.stdin,
  output = process.stdout,
  createInterface = readline.createInterface,
}) {
  const rl = createInterface({
    input,
    output,
    prompt: `${nickname}> `,
    historySize: 0,
    crlfDelay: Infinity,
  });
  let closed = false;

  function prompt() {
    if (!closed && input.isTTY && output.isTTY) rl.prompt(true);
  }

  function log(value) {
    if (closed) return;
    if (output.isTTY) {
      readline.clearLine(output, 0);
      readline.cursorTo(output, 0);
    }
    output.write(toConsoleLine(value) + "\n");
    prompt();
  }

  function close() {
    if (closed) return;
    closed = true;
    rl.close();
  }

  rl.on("line", async (line) => {
    if (closed) return;
    prompt();
    try {
      await onLine(line.trim());
    } catch (error) {
      if (!closed && error?.name !== "AbortError") log(errorMessage(error));
    }
  });
  rl.on("SIGINT", close);
  rl.on("close", () => {
    closed = true;
    onClose();
  });

  prompt();
  return { log, close };
}
