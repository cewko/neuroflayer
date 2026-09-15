import mineflayer from "mineflayer";
import { loadConfig, loadLlmConfig } from "./config.mjs";
import { createLlmClient } from "./llm.mjs";
import { connectMinecraft } from "./minecraft.mjs";
import { openTerminal } from "./terminal.mjs";

process.umask(0o077);

let llm;
let llmConfig;
let client;
let stopping = false;

const terminal = openTerminal({
  onLine: handleLine,
  onClose: () => shutdown(),
  nickname: process.env.MINECRAFT_USERNAME,
});

const commands = new Map([
  [":help", () => terminal.log(":help | :ask <question> | :status | :quit")],
  [":status", () => terminal.log(JSON.stringify(client.status()))],
  [":quit", () => shutdown()],
  [
    ":ask",
    async (question) => {
      if (!question) throw new Error("usage: :ask <question>");
      terminal.log("question queued...");
      const reply = await llm.reply(question);
      if (!stopping) terminal.log(`${llmConfig.model}: ${reply}`);
    },
  ],
]);

function handleLine(line) {
  if (!line || stopping) return;
  if (!line.startsWith(":")) return client.send(line);

  const [name] = line.split(/\s+/, 1);
  const argument = line.slice(name.length).trim();
  const action = commands.get(name);
  if (!action) throw new Error("unknown command. type :help.");

  return action(argument);
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  llm?.cancel();
  process.exitCode = code;

  try {
    client?.quit();
  } finally {
    terminal.close();
  }
}

process.once("SIGINT", () => shutdown());
process.once("SIGTERM", () => shutdown());

try {
  llmConfig = loadLlmConfig();
  llm = createLlmClient(llmConfig);
  const options = loadConfig();

  client = connectMinecraft({
    options,
    createBot: mineflayer.createBot,
    log: terminal.log,
    onEnd: shutdown,
  });

  terminal.log("connecting. type :help for controls");
} catch (error) {
  terminal.log(error.message);
  shutdown(1);
}
