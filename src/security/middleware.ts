import { createMiddleware } from 'hono/factory';
import { type MTLSConfig, validateClientCert } from './mtls';

/**
 * Hono middleware that enforces mTLS on incoming requests.
 * Reads client cert info from Cloudflare's request.cf.tlsClientAuth.
 *
 * In development (non-CF), this middleware is a pass-through.
 */
interface TlsClientAuth {
  certPresented: string;
  certFingerprint: string;
  certNotBefore: string;
  certNotAfter: string;
}

export function mtlsMiddleware(config: MTLSConfig) {
  return createMiddleware<{ Variables: { clientCertFingerprint: string } }>(async (c, next) => {
    // In Cloudflare Workers, TLS client auth info is on the cf object
    const cf = (c.req.raw as Request & { cf?: { tlsClientAuth?: TlsClientAuth } }).cf;
    const certInfo = cf?.tlsClientAuth;

    // If not on Cloudflare (local dev), skip mTLS check
    if (!cf) {
      console.warn('[mTLS] Not running on Cloudflare Workers — skipping mTLS validation');
      await next();
      return;
    }

    const result = validateClientCert(certInfo, config);
    if (!result.valid) {
      return c.json({ error: 'mTLS authentication failed', reason: result.reason }, 403);
    }

    // Attach cert fingerprint to context for downstream use
    if (certInfo?.certFingerprint) {
      c.set('clientCertFingerprint', certInfo.certFingerprint);
    }

    await next();
  });
}
