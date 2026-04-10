import fs from "fs";
import ora from "ora";
import path from "path";
import { z } from "zod";

const CONFIG_FILE = "zipup.config.json";

export const configSchema = z.object({
  host: z.url({
    error: (iss) => {
      if (iss.input === undefined) {
        return "HOST is required.";
      }
      return "Invalid HOST!";
    }
  }),
  appKey: z
    .string("appKey is required.")
    .length(52, "appKey must be 52 characters long."),
  secretKey: z
    .string("secretKey is required.")
    .length(73, "secretKey must be 73 characters long."),
  buildFolder: z.string("buildFolder is required."),
  tags: z.array(z.string()).default([]),
  ignore: z.array(z.string()).default([])
});

export type zipupConfig = z.infer<typeof configSchema>;

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
  const fileConfig = loadFileConfig();
  const config = {
    host: options.host || process.env.ZIPUP_HOST || fileConfig.host,
    appKey: options.appKey || process.env.ZIPUP_APP_KEY || fileConfig.appKey,
    secretKey:
      options.secretKey || process.env.ZIPUP_SECRET_KEY || fileConfig.secretKey,
    buildFolder: options.buildFolder || fileConfig.buildFolder,
    ignore: Array.from(
      new Set([...(options.ignore || []), ...(fileConfig.ignore || [])])
    ),
    tags: Array.from(
      new Set([...(options.tag || []), ...(fileConfig.tags || [])])
    )
  };

  const parsed = configSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${message}`);
  }
  return parsed.data;
}
