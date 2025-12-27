import dotenv from "dotenv";
import { z } from "zod";
import fs from "fs";

export const ConfigSchema = z.object({
  HOST: z.url(),
  APP_KEY: z.string(),
  SECRET_KEY: z.string()
});

export type PassupConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): PassupConfig {
  if (fs.existsSync(".passup.env")) {
    dotenv.config({ path: ".passup.env" });
  }

  const parsed = ConfigSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid Passup config:");
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}
