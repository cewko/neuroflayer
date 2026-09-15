export function connectMinecraft({ options, createBot, log, onEnd }) {
  let state = "connecting";

  const bot = createBot({
    ...options,
    onMsaCode: (data) => log(data.message),
  });

  const active = () => !["closing", "disconected"].includes(state);

  bot.on("spawn", () => {
    if (!active()) return;
    state = "ready";
    log("spawned as " + bot.username);
  });

  bot.on("respawn", () => {
    if (active()) state = "spawning";
  });

  bot.on("messagestr", (text, position) => {
    if (position !== "game_info") log(text);
  });

  bot.on("kicked", (reason) => {
    log("kicked: " + JSON.stringify(reason));
  });

  bot.on("error", (error) => {
    log("minecraft: " + error.message);
    onEnd(1);
  });

  bot.once("end", (reason) => {
    state = "disconnected";
    log("disconnected: " + reason);
    onEnd(0);
  });

  return {
    status: () => ({ state, username: bot.username }),

    send(text) {
      if (state !== "ready") throw new Error("bot is not ready");

      if (
        !text ||
        text.length > 256 ||
        !text.isWellFormed() ||
        /[\p{Cc}\p{Cf}\u00a7]/u.test(text)
      ) {
        throw new Error(
          "message cannot be longer than 256 characters, use plaintext",
        );
      }

      bot.chat(text);
    },

    quit() {
      if (!active()) return;
      state = "closing";
      bot.quit?.("operator quit");
    },
  };
}
