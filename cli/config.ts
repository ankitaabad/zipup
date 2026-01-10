import fs from "fs";
import path from "path";
import { z } from "zod";

const CONFIG_FILE = "zipup.config.json";
const ENV_PREFIX = "zipup_";

export const ConfigSchema = z.object({
  HOST: z.url(),
  APP_KEY: z.string().min(1),
  SECRET_KEY: z.string().min(1),
  BUILD_FOLDER: z.string().default("dist"),
  TAGS: z.array(z.string()).default([])
});

export type zipupConfig = z.infer<typeof ConfigSchema>;

/**
 * Load config from zipup.config.json
 */
function loadFileConfig(): Partial<zipupConfig> {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ Failed to read zipup.config.json");
    process.exit(1);
  }
}

/**
 * Load config from zipup_* env vars
 */
function loadEnvConfig(): Partial<zipupConfig> {
  const config: Record<string, any> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(ENV_PREFIX) || value === undefined) continue;

    const configKey = key.replace(ENV_PREFIX, "");

    switch (configKey) {
      case "TAGS":
        config.TAGS = parseTags(value);
        break;
      default:
        config[configKey] = value;
    }
  }

  return config;
}

/**
 * Helper to parse TAGS from env
 */
function parseTags(value: string): string[] {
  const trimmed = value.trim();

  if (trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      console.error("❌ zipup_TAGS is not valid JSON");
      process.exit(1);
    }
  }

  return trimmed
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Main config loader
 * cliConfig should already be normalized to internal keys
 */
export function loadConfig(
  cliConfig: Partial<zipupConfig> = {}
): zipupConfig {
  const fileConfig = loadFileConfig();
  const envConfig = loadEnvConfig();

  const merged = {
    ...fileConfig,
    ...envConfig,
    ...cliConfig
  };

  const parsed = ConfigSchema.safeParse(merged);

  if (!parsed.success) {
    console.error("❌ Invalid zipup configuration:");
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}
