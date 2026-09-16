function mentionsAI(message, nickname) {
  if (!nickname) return false;
  const words = message.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
  return words.includes(nickname.toLowerCase());
}

export function createAssistant({ llm, queue, memory, state, send, log }) {
  return {
    handle({ username, message }) {
      const current = state();

      if (current.state !== "ready") return;

      const history = memory.read();

      memory.add({
        speaker: username,
        kind: "player",
        message,
      });

      if (!mentionsAI(message, current.username)) return;

      void queue
        .run(async (signal) => {
          const current = state();
          if (current.state !== "ready") {
            throw new Error("bot is not ready");
          }

          const reply = await llm.reply(message, {
            username,
            botName: current.username,
            history,
            signal,
          });

          signal.throwIfAborted();
          return send(reply);
        })
        .catch((error) => {
          log(`AI for ${username}: ${error.message}`);
        });
    },

    recordSent({ username, message }) {
      memory.add({
        speaker: username,
        kind: "you",
        message,
      });
    },

    status: () => ({
      ...queue.status(),
      historyMessages: memory.read().length,
    }),
  };
}
