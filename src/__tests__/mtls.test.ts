import { describe, expect, it } from 'bun:test';
import { createMTLSConfig, normalizeFingerprint, validateClientCert } from '../security/mtls';

// A helper that builds a well-formed certInfo, overridable per test.
function certInfo(overrides: Partial<Parameters<typeof validateClientCert>[0]> = {}) {
  const now = Date.now();
  return {
    certPresented: '1',
    certFingerprintSHA256: 'abcdef0123456789',
    certNotBefore: new Date(now - 60_000).toISOString(),
    certNotAfter: new Date(now + 60_000).toISOString(),
    ...overrides,
  };
}

describe('validateClientCert', () => {
  it('passes through when client certs are not required', () => {
    const config = createMTLSConfig({ requireClientCert: false });
    expect(validateClientCert(undefined, config).valid).toBe(true);
  });

  it('rejects when no certificate is presented', () => {
    const config = createMTLSConfig();
    expect(validateClientCert(undefined, config).valid).toBe(false);
    expect(validateClientCert(certInfo({ certPresented: '0' }), config).valid).toBe(false);
  });

  it('accepts a valid, in-window certificate', () => {
    const config = createMTLSConfig();
    expect(validateClientCert(certInfo(), config).valid).toBe(true);
  });

  it('rejects an expired certificate', () => {
    const config = createMTLSConfig();
    const past = Date.now() - 120_000;
    const result = validateClientCert(
      certInfo({
        certNotBefore: new Date(past - 60_000).toISOString(),
        certNotAfter: new Date(past).toISOString(),
      }),
      config,
    );
    expect(result.valid).toBe(false);
  });

  // Regression: malformed date strings produce NaN, and every NaN comparison is
  // false — which previously let an invalid cert slip through the window check.
  it('rejects a certificate with malformed validity dates instead of silently passing', () => {
    const config = createMTLSConfig();
    const result = validateClientCert(
      certInfo({ certNotBefore: 'not-a-date', certNotAfter: 'also-bad' }),
      config,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('invalid validity dates');
  });

  it('enforces trusted-fingerprint allow-listing', () => {
    const config = createMTLSConfig({ trustedFingerprints: new Set(['abcdef0123456789']) });
    expect(validateClientCert(certInfo(), config).valid).toBe(true);
    expect(validateClientCert(certInfo({ certFingerprintSHA256: 'deadbeef' }), config).valid).toBe(
      false,
    );
  });

  // Regression: trusted list and presented fingerprint can differ in casing and
  // colon-delimiting; normalization must make them compare equal.
  it('matches fingerprints regardless of casing and colon delimiters', () => {
    const config = createMTLSConfig({ trustedFingerprints: new Set(['AB:CD:EF:01:23:45:67:89']) });
    const result = validateClientCert(
      certInfo({ certFingerprintSHA256: 'abcdef0123456789' }),
      config,
    );
    expect(result.valid).toBe(true);
  });
});

describe('normalizeFingerprint', () => {
  it('lower-cases and strips non-hex separators', () => {
    expect(normalizeFingerprint('AB:CD:EF')).toBe('abcdef');
    expect(normalizeFingerprint('ab cd ef')).toBe('abcdef');
  });
});
