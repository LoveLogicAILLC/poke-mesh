import { createMiddleware } from "hono/factory";
import { validateClientCert, type MTLSConfig } from "./mtls";

/**
 * Hono middleware that enforces mTLS on incoming requests.
 * Reads client cert info from Cloudflare's request.cf.tlsClientAuth.
 *
 * In development (non-CF), this middleware is a pass-through.
 */
export function mtlsMiddleware(config: MTLSConfig) {
  return createMiddleware(async (c, next) => {
    // In Cloudflare Workers, TLS client auth info is on the cf object
    const cf = (c.req.raw as any).cf;
    const certInfo = cf?.tlsClientAuth;

    // If not on Cloudflare (local dev), skip mTLS check
    if (!cf) {
      console.warn("[mTLS] Not running on Cloudflare Workers — skipping mTLS validation");
      await next();
      return;
    }

    const result = validateClientCert(certInfo, config);
    if (!result.valid) {
      return c.json(
        { error: "mTLS authentication failed", reason: result.reason },
        403
      );
    }

    // Attach cert fingerprint to context for downstream use
    if (certInfo?.certFingerprint) {
      c.set("clientCertFingerprint" as any, certInfo.certFingerprint);
    }

    await next();
  });
}
