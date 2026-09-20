import { resolve } from "node:path";

function text(env, name, fallback = "") {
  return env[name]?.trim() || fallback;
}

function integer(env, name, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const value = Number(text(env, name, String(fallback)));
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function seconds(env, name, fallback) {
  return integer(env, name, fallback, 1, 2_147_483) * 1000;
}

function boolean(env, name, fallback) {
  const value = text(env, name, String(fallback)).toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

export function loadConfig(env = process.env) {
  const host = text(env, "MINECRAFT_HOST");
  const username = text(env, "MINECRAFT_USERNAME");
  if (!host || !username) {
    throw new Error("set MINECRAFT_HOST and MINECRAFT_USERNAME in .env");
  }
  return {
    host,
    port: integer(env, "MINECRAFT_PORT", 25565, 1, 65535),
    username,
    auth: "offline",
    version: text(env, "MINECRAFT_VERSION") || false,
    viewDistance: "tiny",
    respawn: false,
    hideErrors: true,
  };
}

export function loadLlmConfig(env = process.env) {
  const url = text(env, "LLM_URL");
  const model = text(env, "LLM_MODEL");
  if (!url || !model) throw new Error("set LLM_URL and LLM_MODEL in .env");

  if (!["http:", "https:"].includes(new URL(url).protocol)) {
    throw new Error("LLM_URL must be an HTTP or HTTPS URL");
  }

  const temperature = Number(text(env, "LLM_TEMPERATURE", "0.9"));
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new Error("LLM_TEMPERATURE must be between 0 and 2");
  }

  return {
    url,
    model,
    promptPath: resolve(text(env, "LLM_PROMPT_PATH", "prompt")),
    timeoutMs: integer(env, "LLM_TIMEOUT_MS", 45_000, 1, 2_147_483_647),
    maxTokens: integer(env, "LLM_MAX_TOKENS", 512),
    temperature,
  };
}

export function loadQueueConfig(env = process.env) {
  return {
    maxPending: integer(env, "MAX_PENDING_MESSAGES", 8),
    queueTtlMs: seconds(env, "QUEUE_TTL_SECONDS", 120),
  };
}

export function loadMemoryConfig(env = process.env) {
  return {
    maxMessages: integer(env, "MEMORY_MAX_MESSAGES", 30),
    ttlMs: seconds(env, "MEMORY_TTL_SECONDS", 600),
  };
}

export function loadSettings(env = process.env) {
  return {
    minecraft: loadConfig(env),
    llm: loadLlmConfig(env),
    queue: loadQueueConfig(env),
    memory: loadMemoryConfig(env),
    maxMessageLength: integer(env, "MAX_MESSAGE_LENGTH", 256, 1, 256),
    logMessages: boolean(env, "MINECRAFT_LOG_MESSAGES", true),
  };
}
