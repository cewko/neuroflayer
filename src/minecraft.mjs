import { validateMessage } from "./messages.mjs";

export function connectMinecraft({
  options,
  createBot,
  log,
  onEnd,
  onMessage = () => {},
  onStateChange = () => {},
  onSent = () => {},
}) {
  let state = "connecting";
  const bot = createBot({
    ...options,
    onMsaCode: (data) => log(data.message),
  });

  const active = () => !["closing", "disconnected"].includes(state);

  function changeState(next) {
    if (state === next) return;

    state = next;
    onStateChange(state);
  }

  bot.on("spawn", () => {
    if (!active()) return;
    changeState("ready");
    log("spawned as " + bot.username);
  });

  bot.on("respawn", () => {
    if (active()) changeState("spawning");
  });

  bot.on("death", () => {
    if (active()) changeState("dead");
  });

  bot.on("kicked", (reason) => {
    if (active()) changeState("closing");
    log("kicked: " + JSON.stringify(reason));
  });

  bot.on("error", (error) => {
    log("minecraft: " + error.message);
    onEnd(1);
  });

  bot.once("end", (reason) => {
    changeState("disconnected");
    log("disconnected: " + reason);
    onEnd(0);
  });

  bot.on("chat", (username, message) => {
    if (state !== "ready") return;
    if (username.toLowerCase() === bot.username.toLowerCase()) return;

    onMessage({ username, message });
  });

  bot.on("messagestr", (text, position) => {
    if (position !== "game_info") log(text);
  });

  function send(text) {
    if (state !== "ready") throw new Error("bot is not ready");
    validateMessage(text);
    bot.chat(text);

    if (!text.trimStart().startsWith("/")) {
      onSent({ username: bot.username, message: text });
    }
  }

  return {
    status: () => ({ state, username: bot.username }),
    send,

    sendChat(text) {
      if (typeof text !== "string" || text.trimStart().startsWith("/")) {
        throw new Error("AI replies must be regular messages (non commands)");
      }
      send(text);
    },

    respawn() {
      if (state !== "dead") throw new Error("bot is not dead");
      bot.respawn();
    },

    quit() {
      if (!active()) return;
      changeState("closing");
      bot.quit("operator quit");
    },
  };
}
