/**
 * mTLS utilities for Poke-Mesh agent communication.
 * Uses Web Crypto API (compatible with Cloudflare Workers).
 */

export interface CertificateFingerprint {
  sha256: string;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
}

export interface MTLSConfig {
  requireClientCert: boolean;
  trustedFingerprints: Set<string>;
  allowExpired: boolean;
}

export function createMTLSConfig(opts?: Partial<MTLSConfig>): MTLSConfig {
  return {
    requireClientCert: opts?.requireClientCert ?? true,
    trustedFingerprints: opts?.trustedFingerprints ?? new Set(),
    allowExpired: opts?.allowExpired ?? false,
  };
}

/**
 * Validate an incoming client certificate against trusted fingerprints.
 * On Cloudflare Workers, client cert info is available via request.cf.tlsClientAuth
 */
export function validateClientCert(
  certInfo:
    | {
        certPresented: string;
        certFingerprint: string;
        certNotBefore: string;
        certNotAfter: string;
      }
    | undefined,
  config: MTLSConfig
): { valid: boolean; reason?: string } {
  if (!config.requireClientCert) {
    return { valid: true };
  }

  if (!certInfo || certInfo.certPresented !== "1") {
    return { valid: false, reason: "No client certificate presented" };
  }

  if (!config.allowExpired) {
    const now = Date.now();
    const notBefore = new Date(certInfo.certNotBefore).getTime();
    const notAfter = new Date(certInfo.certNotAfter).getTime();
    if (now < notBefore || now > notAfter) {
      return { valid: false, reason: "Client certificate expired or not yet valid" };
    }
  }

  if (
    config.trustedFingerprints.size > 0 &&
    !config.trustedFingerprints.has(certInfo.certFingerprint)
  ) {
    return { valid: false, reason: "Client certificate fingerprint not trusted" };
  }

  return { valid: true };
}

/**
 * Generate a SHA-256 fingerprint from raw bytes (for comparing certs).
 */
export async function sha256Fingerprint(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(":");
}
