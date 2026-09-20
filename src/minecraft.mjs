import { errorMessage, validateMessage } from "./messages.mjs";

export function connectMinecraft({
  options,
  createBot,
  log,
  onEnd,
  maxMessageLength,
  onMessage = () => {},
  onStateChange = () => {},
  onSent = () => {},
  logMessages = true,
}) {
  let state = "connecting";
  let endReported = false;
  let quitRequested = false;
  const bot = createBot({ ...options });

  const active = () => state !== "closing" && state !== "disconnected";

  function changeState(next) {
    if (state === next) return;

    state = next;
    onStateChange(state);
  }

  function reportEnd(code) {
    if (endReported) return;
    endReported = true;
    onEnd(code);
  }

  bot.on("spawn", () => {
    if (!active()) return;
    changeState("ready");
    log(`spawned as ${bot.username}`);
  });

  bot.on("respawn", () => {
    if (active()) changeState("spawning");
  });

  bot.on("death", () => {
    if (active()) changeState("dead");
  });

  bot.on("kicked", (reason) => {
    if (active()) changeState("closing");
    log(`kicked: ${JSON.stringify(reason)}`);
  });

  bot.on("error", (error) => {
    log(`minecraft: ${errorMessage(error)}`);
    reportEnd(1);
  });

  bot.once("end", (reason) => {
    changeState("disconnected");
    log(`disconnected: ${reason}`);
    reportEnd(0);
  });

  bot.on("chat", (username, message) => {
    if (state !== "ready") return;
    if (username.toLowerCase() === bot.username.toLowerCase()) return;

    onMessage({ username, message });
  });

  if (logMessages) {
    bot.on("messagestr", (text, position) => {
      if (position !== "game_info") log(text);
    });
  }

  function send(text) {
    if (state !== "ready") throw new Error("bot is not ready");
    validateMessage(text, maxMessageLength);
    bot.chat(text);

    if (!text.trimStart().startsWith("/")) {
      onSent({ username: bot.username, message: text });
    }
  }

  function sendMessage(text) {
    if (typeof text !== "string" || text.trimStart().startsWith("/")) {
      throw new Error("AI replies must be regular messages (non commands)");
    }
    send(text);
  }

  function respawn() {
    if (state !== "dead") throw new Error("bot is not dead");
    bot.respawn();
  }

  function quit() {
    if (quitRequested || state === "disconnected") return;
    quitRequested = true;
    changeState("closing");
    bot.quit("operator quit");
  }

  return {
    status: () => ({ state, username: bot.username }),
    send,
    sendMessage,
    respawn,
    quit,
  };
}
