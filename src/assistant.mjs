function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createMentionStripper(nickname) {
  if (!nickname) return () => null;

  const escapedNickname = escapeRegex(nickname);
  const regex = new RegExp(
    `(^|[^a-z0-9_])${escapedNickname}(?=$|[^a-z0-9_])`,
    "gi",
  );

  return (message) => {
    let mentioned = false;
    regex.lastIndex = 0;

    const stripped = String(message ?? "").replace(regex, (_, prefix) => {
      mentioned = true;
      return prefix;
    });

    return mentioned ? stripped.trim() : null;
  };
}

export function createAssistant({
  llm,
  queue,
  memory,
  state,
  send,
  log,
  nickname,
}) {
  let enabled = true;
  const stripMention = createMentionStripper(nickname);

  function setEnabled(value) {
    enabled = value;
    if (!enabled) queue.cancelPending();
  }

  return {
    setEnabled,
    handle({ username, message }) {
      if (!enabled) return;
      const current = state();

      if (current.state !== "ready") return;

      const history = memory.read();

      memory.add({
        speaker: username,
        kind: "player",
        message,
      });

      const question = stripMention(message);
      if (!question) return;

      void queue
        .run(async (signal) => {
          const current = state();
          if (current.state !== "ready") {
            throw new Error("bot is not ready");
          }

          const reply = await llm.reply(question, {
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
      enabled,
      ...queue.status(),
      historyMessages: memory.read().length,
    }),
  };
}
