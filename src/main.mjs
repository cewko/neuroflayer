import mineflayer from "mineflayer";
import { loadConfig, loadLlmConfig, loadQueueConfig } from "./config.mjs";
import { createLlmClient } from "./llm.mjs";
import { createMentionAssistant } from "./assistant.mjs";
import { connectMinecraft } from "./minecraft.mjs";
import { openTerminal } from "./terminal.mjs";
import { createTaskQueue } from "./queue.mjs";
import { loadReplyInstructions } from "./instructions.mjs";

process.umask(0o077);

let llm;
let llmConfig;
let queue;
let client;
let stopping = false;

const terminal = openTerminal({
  onLine: handleLine,
  onClose: () => shutdown(),
  nickname: process.env.MINECRAFT_USERNAME,
});

const commands = new Map([
  [
    ":help",
    () => terminal.log(":help | :ask <question> | :status | :respawn | :quit"),
  ],
  [
    ":status",
    () =>
      terminal.log(
        JSON.stringify({
          ...client.status(),
          ai: queue.status(),
        }),
      ),
  ],
  [":respawn", () => client.respawn()],
  [":quit", () => shutdown()],
  [
    ":ask",
    async (question) => {
      if (!question) throw new Error("usage: :ask <question>");

      terminal.log("question queued...");

      const reply = await queue.run((signal) =>
        llm.reply(question, { signal }),
      );

      if (!stopping) {
        terminal.log(`${llmConfig.model}: ${reply}`);
      }
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
  process.exitCode = code;
  queue?.stop();
  try {
    client?.quit();
  } finally {
    terminal.close();
  }
}

process.once("SIGINT", () => shutdown());
process.once("SIGTERM", () => shutdown());

try {
  const options = loadConfig();
  llmConfig = loadLlmConfig();

  llm = createLlmClient({
    ...llmConfig,
    instructions: loadReplyInstructions(llmConfig.promptPath),
  });

  queue = createTaskQueue(loadQueueConfig());

  const assistant = createMentionAssistant({
    llm,
    queue,
    state: () => client?.status() ?? { state: "connecting" },
    send: (text) => client.sendChat(text),
    log: terminal.log,
  });

  client = connectMinecraft({
    options,
    createBot: mineflayer.createBot,
    log: terminal.log,
    onEnd: shutdown,
    onMessage: assistant.handle,
    onStateChange: (state) => {
      if (state !== "ready") queue.cancelPending();
    },
  });

  terminal.log(
    "connecting. mention replies are enabled. type :help for controls",
  );
} catch (error) {
  terminal.log(error.message);
  shutdown(1);
}
