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

  function expire() {
    if (now() - updatedAt >= ttlMs) clear();
  }

  function setEnabled(value) {
    if (memoryEnabled === value) return;
    memoryEnabled = value;
    if (!memoryEnabled) clear();
  }

  function add(entry) {
    if (!memoryEnabled) return;
    expire();
    entries.push({ ...entry });
    updatedAt = now();

    if (entries.length > maxMessages) {
      entries.splice(0, entries.length - maxMessages);
    }
  }

  function read() {
    if (!memoryEnabled) return [];
    expire();
    return entries.map((entry) => ({ ...entry }));
  }

  function status() {
    return {
      enabled: memoryEnabled,
      messages: read().length,
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
