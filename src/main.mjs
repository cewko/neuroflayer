import mineflayer from "mineflayer";
import { loadConfig } from "./config.mjs";
import { connectMinecraft } from "./minecraft.mjs";
import { openTerminal } from "./terminal.mjs";

process.umask(0o077);

let client;
let stopping = false;

const terminal = openTerminal({
  onLine: handleLine,
  onClose: () => shutdown(),
  nickname: process.env.MINECRAFT_USERNAME,
});

const commands = new Map([
  [":help", () => terminal.log(":help | :status | :quit")],
  [":status", () => terminal.log(JSON.stringify(client.status()))],
  [":quit", () => shutdown()],
]);

function handleLine(line) {
  if (!line || stopping) return;
  if (!line.startsWith(":")) return client.send(line);

  const action = commands.get(line);
  if (!action) throw new Error("unknown command. type :help.");

  return action();
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;

  try {
    client?.quit();
  } finally {
    terminal.close();
  }
}

process.once("SIGINT", () => shutdown());
process.once("SIGTERM", () => shutdown());

try {
  const options = loadConfig();

  client = connectMinecraft({
    options,
    createBot: mineflayer.createBot,
    log: terminal.log,
    onEnd: shutdown,
  });

  terminal.log("connecting. type :help for controls");
} catch (error) {
  terminal.log(error.message);
  shutdown(1);
}
