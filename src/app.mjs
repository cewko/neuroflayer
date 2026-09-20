import { createAssistant } from "./assistant.mjs";
import { createCommandHandler } from "./commands.mjs";
import { createLlmClient } from "./llm.mjs";
import { createConversationMemory } from "./memory.mjs";
import { connectMinecraft } from "./minecraft.mjs";
import { createTaskQueue } from "./queue.mjs";
import { openTerminal } from "./terminal.mjs";
import { errorMessage } from "./messages.mjs";

export function startApplication({
  config,
  instructions,
  createBot,
  fetchFn = fetch,
  openTerminalFn = openTerminal,
  onStop = () => {},
}) {
  const queue = createTaskQueue(config.queue);
  const memory = createConversationMemory(config.memory);
  const llm = createLlmClient({
    ...config.llm,
    instructions,
    fetchFn,
    maxMessageLength: config.maxMessageLength,
  });

  let client;
  let terminal;
  let assistant;
  let stopping = false;

  let handleLine = () => {
    throw new Error("bot is starting");
  };

  function stop(code = 0) {
    if (stopping) return;

    stopping = true;
    queue.stop();
    memory.clear();

    try {
      client?.quit();
    } catch (error) {
      code = 1;
      terminal?.log(`minecraft: ${errorMessage(error)}`);
    } finally {
      try {
        terminal?.close();
      } finally {
        onStop(code);
      }
    }
  }

  try {
    terminal = openTerminalFn({
      nickname: config.minecraft.username,
      onLine: (line) => {
        if (!stopping) return handleLine(line);
      },
      onClose: () => stop(),
    });

    assistant = createAssistant({
      llm,
      queue,
      memory,
      state: () => client?.status() ?? { state: "connecting " },
      send: (text) => client.sendMessage(text),
      log: terminal.log,
      nickname: config.minecraft.username,
    });

    client = connectMinecraft({
      options: config.minecraft,
      createBot,
      log: terminal.log,
      logMessages: config.logMessages,
      maxMessageLength: config.maxMessageLength,
      onEnd: stop,
      onMessage: assistant.handle,
      onSent: assistant.recordSent,
      onStateChange: (state) => {
        if (state !== "ready") queue.cancelPending();
      },
    });

    handleLine = createCommandHandler({
      client,
      assistant,
      queue,
      llm,
      memory,
      model: config.llm.model,
      log: terminal.log,
      onQuit: stop,
      isStopping: () => stopping,
    });

    terminal.log(
      "connecting. mention replies are enabled. type :help for controls",
    );
  } catch (error) {
    stop(1);
    throw error;
  }

  return {
    stop,
    handleLine,
    status: () => ({ ...client.status(), ai: assistant.status(), stopping }),
  };
}
