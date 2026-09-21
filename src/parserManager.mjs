export function createParserManager({ parsers }) {
  let active = null;

  function set(name) {
    if (name === "none") {
      active = null;
      return;
    }

    const parser = parsers.get(name);
    if (!parser) throw new Error(`unknown parser: ${name}. use :parser index`);
    active = parser;
  }

  function parse(data) {
    if (!active) return null;
    const parsed = active.parseMessage(data);
    if (parsed == null) return null;

    if (
      typeof parsed?.username !== "string" ||
      !parsed.username.trim() ||
      typeof parsed?.message !== "string" ||
      !parsed.message.trim()
    ) {
      throw new Error("parseMessage must return { username, message } or null");
    }

    return { username: parsed.username.trim(), message: parsed.message.trim() };
  }

  return {
    index: () => [...parsers.keys()],
    current: () => active?.name ?? "none",
    enabled: () => active !== null,
    set,
    parse,
  };
}
