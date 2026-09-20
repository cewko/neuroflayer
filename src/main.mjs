import mineflayer from "mineflayer";
import { startApplication } from "./app.mjs";
import { loadSettings } from "./config.mjs";
import { loadReplyInstructions } from "./instructions.mjs";
import { errorMessage, toConsoleLine } from "./messages.mjs";

process.umask(0o077);

let app;
const stop = () => app?.stop();
function onStop(code) {
  process.exitCode = code;
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
}

try {
  const config = loadSettings();
  const instructions = loadReplyInstructions(config.llm.promptPath);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  app = startApplication({
    config,
    instructions,
    createBot: mineflayer.createBot,
    onStop,
  });
} catch (error) {
  onStop(1);
  process.stderr.write(toConsoleLine(errorMessage(error)) + "\n");
}
