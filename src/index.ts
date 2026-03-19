import app from "./app";
import type { Env } from "./types/env";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Bind environment to Hono context
    return app.fetch(request, env, ctx);
  },
};
