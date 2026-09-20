const HELP =
  ":help | :llm <on/off> | :memory <on/off> | :ask <question> | " +
  ":status | :respawn | :quit | :forget";

function parseToggle(argument, command) {
  const value = argument.trim().toLowerCase();
  if (value == "on") return true;
  if (value == "off") return false;
  throw new Error(`usage: ${command} <on/off>`);
}

export function createCommandHandler({
  client,
  assistant,
  queue,
  llm,
  memory,
  model,
  log,
  onQuit,
  isStopping = () => false,
}) {
  const commands = new Map([
    [":help", () => log(HELP)],
    [
      ":status",
      () => log(JSON.stringify({ ...client.status(), ai: assistant.status() })),
    ],
    [":respawn", () => client.respawn()],
    [":quit", () => onQuit()],
    [
      ":forget",
      () => {
        queue.cancelPending();
        memory.clear();
        log("history cleared");
      },
    ],
    [
      ":llm",
      (argument) => {
        const enabled = parseToggle(argument, ":llm");
        assistant.setRepliesEnabled(enabled);
        log(`llm replies: ${enabled ? "on" : "off"}`);
      },
    ],
    [
      ":memory",
      (argument) => {
        const enabled = parseToggle(argument, ":memory");
        assistant.setMemoryEnabled(enabled);
        log(enabled ? "memory: on" : "memory: off. history cleared");
      },
    ],
    [
      ":ask",
      async (question) => {
        if (!question) throw new Error("usage: :ask <question>");
        log("question queued...");
        const reply = await queue.run((signal) =>
          llm.reply(question, { signal }),
        );
        if (!isStopping()) log(`${model}: ${reply}`);
      },
    ],
  ]);

  return function handleLine(input) {
    const line = input.trim();
    if (!line || isStopping()) return;
    if (!line.startsWith(":")) return client.send(line);

    const [name] = line.split(/\s+/, 1);
    const action = commands.get(name);
    if (!action) throw new Error("unknown command. type :help");
    return action(line.slice(name.length).trim());
  };
}
