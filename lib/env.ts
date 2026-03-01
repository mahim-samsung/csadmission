import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),

  // Ollama
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3:8b"),

  // Crawler
  CRAWL_MAX_DEPTH: z.coerce.number().int().min(1).max(10).default(2),
  CRAWL_MAX_PAGES: z.coerce.number().int().min(1).max(500).default(12),

  // App
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.format();
    console.error("❌ Invalid environment variables:", JSON.stringify(formatted, null, 2));
    throw new Error("Invalid environment variables. Check your .env.local file.");
  }

  return parsed.data;
}

// Singleton — parsed once at module load time.
export const env = parseEnv();
