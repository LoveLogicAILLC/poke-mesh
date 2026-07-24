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

/**
 * Normalize a certificate fingerprint for comparison: lower-case and strip
 * any non-hex separators (colons, spaces) so `AB:CD` and `abcd` compare equal.
 */
export function normalizeFingerprint(fp: string): string {
  return fp.toLowerCase().replace(/[^a-f0-9]/g, '');
}

export function createMTLSConfig(opts?: Partial<MTLSConfig>): MTLSConfig {
  const trusted = opts?.trustedFingerprints ?? new Set<string>();
  return {
    requireClientCert: opts?.requireClientCert ?? true,
    // Normalize on the way in so trust comparisons are format-agnostic.
    trustedFingerprints: new Set([...trusted].map(normalizeFingerprint)),
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
        // Cloudflare exposes the SHA-256 fingerprint as `certFingerprintSHA256`.
        certFingerprintSHA256: string;
        certNotBefore: string;
        certNotAfter: string;
      }
    | undefined,
  config: MTLSConfig,
): { valid: boolean; reason?: string } {
  if (!config.requireClientCert) {
    return { valid: true };
  }

  if (!certInfo || certInfo.certPresented !== '1') {
    return { valid: false, reason: 'No client certificate presented' };
  }

  if (!config.allowExpired) {
    const now = Date.now();
    const notBefore = new Date(certInfo.certNotBefore).getTime();
    const notAfter = new Date(certInfo.certNotAfter).getTime();
    // Malformed date strings yield NaN, and every NaN comparison is false —
    // which would silently pass an invalid cert. Reject those explicitly.
    if (Number.isNaN(notBefore) || Number.isNaN(notAfter)) {
      return { valid: false, reason: 'Client certificate has invalid validity dates' };
    }
    if (now < notBefore || now > notAfter) {
      return { valid: false, reason: 'Client certificate expired or not yet valid' };
    }
  }

  if (
    config.trustedFingerprints.size > 0 &&
    !config.trustedFingerprints.has(normalizeFingerprint(certInfo.certFingerprintSHA256))
  ) {
    return { valid: false, reason: 'Client certificate fingerprint not trusted' };
  }

  return { valid: true };
}

/**
 * Generate a SHA-256 fingerprint from raw bytes (for comparing certs).
 */
export async function sha256Fingerprint(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');
}
