export function loadConfig(env = process.env) {
  const host = env.MINECRAFT_HOST?.trim();
  const username = env.MINECRAFT_USERNAME?.trim();
  const auth = "offline";
  const port = Number(env.MINECRAFT_PORT?.trim() || 25565);
  const version = env.MINECRAFT_VERSION?.trim() || false;

  if (!host || !username) {
    throw new Error("set MINECRAFT_HOST and MINECRAFT_USERNAME in .env");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MINECRAFT_PORT must be between 1 and 65535");
  }

  return {
    host,
    port,
    username,
    auth,
    version,
    viewDistance: "tiny",
    respawn: false,
    hideErrors: true,
  };
}
