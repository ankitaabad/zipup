import fs from "fs";
import ora from "ora";
import path from "path";
import { z } from "zod";

const CONFIG_FILE = "zipup.config.json";
const ENV_PREFIX = "zipup_";

export const ConfigSchema = z.object({
  HOST: z.url({
    error: (iss) => {
      if (iss.input === undefined) {
        return "HOST is required.";
      }
      return "Invalid HOST!";
    }
  }),
  APP_KEY: z
    .string("APP_KEY is required.")
    .length(52, "APP_KEY must be 52 characters long."),
  SECRET_KEY: z
    .string("SECRET_KEY is required.")
    .length(73, "SECRET_KEY must be 73 characters long."),
  BUILD_FOLDER: z.string("BUILD_FOLDER is required."),
  TAGS: z.array(z.string()).default([]),
  IGNORES: z.array(z.string()).default([])
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
export function loadConfig(options: {
  host?: string;
  appKey?: string;
  secretKey?: string;
  buildFolder?: string;
  tag?: string[];
  ignore?: string[];
}): zipupConfig {
  const cliConfig: Partial<zipupConfig> = {
    HOST: options.host,
    APP_KEY: options.appKey,
    SECRET_KEY: options.secretKey,
    BUILD_FOLDER: options.buildFolder,
    TAGS: options.tag?.length ? options.tag : undefined,
    IGNORES: options.ignore?.length ? options.ignore : undefined
  };

  /**
   * <dir> argument always wins for build folder
   */
  // cliConfig.BUILD_FOLDER = dir;

  Object.keys(cliConfig).forEach((key) => {
    if (
      cliConfig[key as keyof zipupConfig] === undefined ||
      cliConfig[key as keyof zipupConfig] === null
    ) {
      delete cliConfig[key as keyof zipupConfig];
    }
  });
  const fileConfig = loadFileConfig();
  const envConfig = loadEnvConfig();
  const merged = {
    ...fileConfig,
    ...envConfig,
    ...cliConfig,
    IGNORES: Array.from(
      new Set([
        ...(fileConfig.IGNORES || []),
        ...(envConfig.IGNORES || []),
        ...(cliConfig.IGNORES || [])
      ])
    )
  };
  const parsed = ConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${message}`);
  }
  return parsed.data;
}
