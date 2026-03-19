import { z } from 'zod';

const EnvSchema = z.object({
  OPENWEATHER_API_KEY: z.string().min(1).optional(),
  GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  YOUTUBE_API_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  // We intentionally don't hard-fail here to allow the server to boot for non-key endpoints.
  return parsed.success ? parsed.data : {};
}

