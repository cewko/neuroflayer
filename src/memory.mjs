export function createConversationMemory({
  maxMessages,
  ttlMs,
  now = Date.now,
}) {
  const entries = [];
  let updatedAt = 0;

  function clear() {
    entries.length = 0;
    updatedAt = 0;
  }

  function expire() {
    if (now() - updatedAt >= ttlMs) clear();
  }

  return {
    add(entry) {
      expire();
      entries.push({ ...entry });
      updatedAt = now();

      if (entries.length > maxMessages) {
        entries.splice(0, entries.length - maxMessages);
      }
    },

    read() {
      expire();
      return entries.map((entry) => ({ ...entry }));
    },

    clear,
  };
}
