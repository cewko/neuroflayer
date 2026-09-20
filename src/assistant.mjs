import { errorMessage } from "./messages.mjs";

function createMentionStripper(nickname) {
  if (!nickname) return () => null;
  const escaped = nickname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^a-z0-9_])${escaped}(?=$|[^a-z0-9_])`, "gi");

  return (message) => {
    let mentioned = false;
    pattern.lastIndex = 0;
    const question = String(message ?? "").replace(pattern, (_, prefix) => {
      mentioned = true;
      return prefix;
    });
    return mentioned ? question.trim() : null;
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
  let repliesEnabled = true;
  const stripMention = createMentionStripper(nickname);

  function requireReady() {
    const current = state();
    if (current.state !== "ready") throw new Error("bot is not ready");
    return current;
  }

  function handle({ username, message }) {
    if (state().state !== "ready") return;

    const question = repliesEnabled ? stripMention(message) : null;
    const history = question ? memory.read() : [];
    memory.add({ speaker: username, kind: "player", message });
    if (!question) return;

    return queue
      .run(async (signal) => {
        const current = requireReady();
        const reply = await llm.reply(question, {
          username,
          botName: current.username,
          history,
          signal,
        });
        signal.throwIfAborted();
        requireReady();
        return send(reply);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          log(`AI for ${username}: ${errorMessage(error)}`);
        }
      });
  }

  function setRepliesEnabled(value) {
    repliesEnabled = value;
    if (!value) queue.cancelPending();
  }

  function setMemoryEnabled(value) {
    memory.setEnabled(value);
    if (!value) queue.cancelPending();
  }

  function status() {
    const currentMemory = memory.status();
    return {
      repliesEnabled,
      memory: currentMemory,
      historyMessages: currentMemory.messages,
      ...queue.status(),
    };
  }

  function recordSent({ username, message }) {
    memory.add({ speaker: username, kind: "you", message });
  }

  return { handle, recordSent, setRepliesEnabled, setMemoryEnabled, status };
}
