import mineflayer from "mineflayer";
import {
  loadConfig,
  loadLlmConfig,
  loadQueueConfig,
  loadMemoryConfig,
} from "./config.mjs";
import { createLlmClient } from "./llm.mjs";
import { createAssistant } from "./assistant.mjs";
import { createConversationMemory } from "./memory.mjs";
import { connectMinecraft } from "./minecraft.mjs";
import { openTerminal } from "./terminal.mjs";
import { createTaskQueue } from "./queue.mjs";
import { loadReplyInstructions } from "./instructions.mjs";

process.umask(0o077);

let llm;
let llmConfig;
let queue;
let client;
let assistant;
let memory;
let stopping = false;

const terminal = openTerminal({
  onLine: handleLine,
  onClose: () => shutdown(),
  nickname: process.env.MINECRAFT_USERNAME,
});

const commands = new Map([
  [
    ":help",
    () =>
      terminal.log(
        ":help | :llm <on/off> | :memory <on/off> | :ask <question> | :status | " +
          ":respawn | :quit | :forget",
      ),
  ],
  [
    ":status",
    () =>
      terminal.log(
        JSON.stringify({
          ...client.status(),
          ai: assistant.status(),
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
  [
    ":forget",
    () => {
      queue.cancelPending();
      memory.clear();
      terminal.log("history cleared");
    },
  ],
  [
    ":llm",
    (argument) => {
      switch (argument.toLowerCase()) {
        case "on":
          assistant.setRepliesEnabled(true);
          return terminal.log("llm replies: on");
        case "off":
          assistant.setRepliesEnabled(false);
          return terminal.log("llm replies: off");
        default:
          throw new Error("usage: :llm <on/off>");
      }
    },
  ],
  [
    ":memory",
    (argument) => {
      switch (argument.trim().toLowerCase()) {
        case "on":
          assistant.setMemoryEnabled(true);
          return terminal.log("memory: on");
        case "off":
          assistant.setMemoryEnabled(false);
          return terminal.log("memory: off. history cleared");
        default:
          throw new Error("usage: :memory <on/off>");
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
  memory?.clear();
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
  memory = createConversationMemory(loadMemoryConfig());
  assistant = createAssistant({
    llm,
    queue,
    memory,
    state: () => client?.status() ?? { state: "connecting" },
    send: (text) => client.sendChat(text),
    log: terminal.log,
    nickname: options.username,
  });

  client = connectMinecraft({
    options,
    createBot: mineflayer.createBot,
    log: terminal.log,
    onEnd: shutdown,
    onMessage: assistant.handle,
    onSent: assistant.recordSent,
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
