import { resolve } from "node:path";

function integer(env, name, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const value = Number(env[name]?.trim() || fallback);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function loadConfig(env = process.env) {
  const host = env.MINECRAFT_HOST?.trim();
  const username = env.MINECRAFT_USERNAME?.trim();
  const auth = "offline";
  const version = env.MINECRAFT_VERSION?.trim() || false;

  if (!host || !username) {
    throw new Error("set MINECRAFT_HOST and MINECRAFT_USERNAME in .env");
  }

  return {
    host,
    port: integer(env, "MINECRAFT_PORT", 25565, 1, 65535),
    username,
    auth,
    version,
    viewDistance: "tiny",
    respawn: false,
    hideErrors: true,
  };
}

export function loadLlmConfig(env = process.env) {
  const url = env.LLM_URL?.trim();
  const model = env.LLM_MODEL?.trim();

  if (!url || !model) throw new Error("set LLM_URL and LLM_MODEL in .env");
  if (!["http:", "https:"].includes(new URL(url).protocol)) {
    throw new Error("LLM_URL must be an HTTP or HTTPS URL");
  }

  const temperature = Number(env.LLM_TEMPERATURE?.trim() || 0.9);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new Error("LLM_TEMPERATURE must be between 0 and 2");
  }

  return {
    url,
    model,
    promptPath: resolve(env.LLM_PROMPT_PATH?.trim() || "prompt"),
    timeoutMs: integer(env, "LLM_TIMEOUT_MS", 45_000, 1, 2_147_483_647),
    maxTokens: integer(env, "LLM_MAX_TOKENS", 512),
    temperature,
  };
}

function seconds(env, name, fallback) {
  return integer(env, name, fallback, 1, 2_147_483) * 1000;
}

export function loadQueueConfig(env = process.env) {
  return {
    maxPending: integer(env, "MAX_PENDING_MESSAGES", 8),
    queueTtlMs: seconds(env, "QUEUE_TTL_SECONDS", 120),
  };
}
