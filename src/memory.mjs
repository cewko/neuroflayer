export function createConversationMemory({
  maxMessages,
  ttlMs,
  enabled = true,
  now = Date.now,
}) {
  const entries = [];
  let updatedAt = 0;
  let memoryEnabled = enabled;

  function clear() {
    entries.length = 0;
    updatedAt = 0;
  }

  function expire(time = now()) {
    if (entries.length && time - updatedAt >= ttlMs) clear();
  }

  function add(entry) {
    if (!memoryEnabled) return;
    const time = now();
    expire(time);
    entries.push({ ...entry });
    updatedAt = time;

    if (entries.length > maxMessages) {
      entries.splice(0, entries.length - maxMessages);
    }
  }

  function read() {
    if (!memoryEnabled) return [];
    expire();
    return entries.map((entry) => ({ ...entry }));
  }

  function setEnabled(value) {
    if (memoryEnabled === value) return;
    memoryEnabled = value;
    if (!memoryEnabled) clear();
  }

  function status() {
    expire();

    return {
      enabled: memoryEnabled,
      messages: entries.length,
    };
  }

  return {
    add,
    read,
    clear,
    setEnabled,
    isEnabled: () => memoryEnabled,
    status,
  };
}
