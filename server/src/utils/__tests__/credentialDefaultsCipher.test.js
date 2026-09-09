const crypto = require('crypto')

describe('credentialDefaultsCipher', () => {
  const ORIGINAL_ENV = process.env.CREDENTIAL_DEFAULTS_KEY

  afterEach(() => {
    process.env.CREDENTIAL_DEFAULTS_KEY = ORIGINAL_ENV
    jest.resetModules()
  })

  test('throws a clear config error when no key is set (never silently insecure)', () => {
    delete process.env.CREDENTIAL_DEFAULTS_KEY
    jest.resetModules()
    const { encryptSecret, CredentialDefaultsCryptoError } = require('../credentialDefaultsCipher')
    expect(() => encryptSecret('hello')).toThrow(CredentialDefaultsCryptoError)
  })

  test('isCryptoConfigured() reflects whether the key is set/valid', () => {
    delete process.env.CREDENTIAL_DEFAULTS_KEY
    jest.resetModules()
    let mod = require('../credentialDefaultsCipher')
    expect(mod.isCryptoConfigured()).toBe(false)

    process.env.CREDENTIAL_DEFAULTS_KEY = crypto.randomBytes(32).toString('base64')
    jest.resetModules()
    mod = require('../credentialDefaultsCipher')
    expect(mod.isCryptoConfigured()).toBe(true)
  })

  test('rejects a key that does not decode to exactly 32 bytes', () => {
    process.env.CREDENTIAL_DEFAULTS_KEY = Buffer.from('too-short').toString('base64')
    jest.resetModules()
    const { encryptSecret, CredentialDefaultsCryptoError } = require('../credentialDefaultsCipher')
    expect(() => encryptSecret('hello')).toThrow(CredentialDefaultsCryptoError)
  })

  test('encrypt then decrypt round-trips the exact plaintext', () => {
    process.env.CREDENTIAL_DEFAULTS_KEY = crypto.randomBytes(32).toString('base64')
    jest.resetModules()
    const { encryptSecret, decryptSecret } = require('../credentialDefaultsCipher')
    const blob = encryptSecret('Academy#Default2026')
    expect(blob).not.toMatch(/Academy#Default2026/)
    expect(decryptSecret(blob)).toBe('Academy#Default2026')
  })

  test('accepts a hex-encoded 32-byte key too', () => {
    process.env.CREDENTIAL_DEFAULTS_KEY = crypto.randomBytes(32).toString('hex')
    jest.resetModules()
    const { encryptSecret, decryptSecret } = require('../credentialDefaultsCipher')
    const blob = encryptSecret('hexKeyTest')
    expect(decryptSecret(blob)).toBe('hexKeyTest')
  })

  test('a tampered ciphertext fails authentication instead of decrypting to garbage', () => {
    process.env.CREDENTIAL_DEFAULTS_KEY = crypto.randomBytes(32).toString('base64')
    jest.resetModules()
    const { encryptSecret, decryptSecret, CredentialDefaultsCryptoError } = require('../credentialDefaultsCipher')
    const blob = encryptSecret('OriginalSecret')
    const buf = Buffer.from(blob, 'base64')
    buf[buf.length - 1] ^= 0xff // flip a byte in the ciphertext
    expect(() => decryptSecret(buf.toString('base64'))).toThrow(CredentialDefaultsCryptoError)
  })

  test('decrypting with a different key fails instead of leaking plaintext', () => {
    process.env.CREDENTIAL_DEFAULTS_KEY = crypto.randomBytes(32).toString('base64')
    jest.resetModules()
    const { encryptSecret } = require('../credentialDefaultsCipher')
    const blob = encryptSecret('SecretUnderKeyA')

    process.env.CREDENTIAL_DEFAULTS_KEY = crypto.randomBytes(32).toString('base64')
    jest.resetModules()
    const { decryptSecret, CredentialDefaultsCryptoError } = require('../credentialDefaultsCipher')
    expect(() => decryptSecret(blob)).toThrow(CredentialDefaultsCryptoError)
  })
})
