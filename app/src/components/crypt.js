const config = require('config');
const crypto = require('crypto');

// GCM mode is good for situations with random access and authenticity requirements
// CBC mode is older, but is sufficiently secure with high performance for short payloads
const algorithm = 'aes-256-cbc';
const encoding = 'base64';
const encodingCheck = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}={2})$/;
const hashAlgorithm = 'sha256';

const crypt = {
  /**
   * @function encrypt
   * Yields an encrypted string containing the iv and ciphertext, separated by a colon.
   * If no key is provided, ciphertext will be the plaintext in base64 encoding.
   * @param {string} text The input string contents
   * @returns {string} The encrypted base64 formatted string in the format `iv:ciphertext`.
   */
  encrypt(text) {
    if (crypt.isEncrypted(text)) return text;

    const passphrase = config.has('server.passphrase') ? config.get('server.passphrase') : undefined;
    if (passphrase && passphrase.length) {
      let content = Buffer.from(text);
      const iv = crypto.randomBytes(16);
      const hash = crypto.createHash(hashAlgorithm);
      // AES-256 key length must be exactly 32 bytes
      const key = hash.update(passphrase).digest().subarray(0, 32);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      content = Buffer.concat([cipher.update(text), cipher.final()]);
      return `${iv.toString(encoding)}:${content.toString(encoding)}`;
    } else {
      return text;
    }
  },

  /**
   * @function decrypt
   * Yields the plaintext by accepting an encrypted string containing the iv and
   * ciphertext, separated by a colon. If no key is provided, the plaintext will be
   * the ciphertext.
   * @param {string} text The input encrypted string contents
   * @returns {string} The decrypted plaintext string, usually in utf-8
   */
  decrypt(text) {
    if (!crypt.isEncrypted(text)) return text;

    const passphrase = config.has('server.passphrase') ? config.get('server.passphrase') : undefined;
    if (passphrase && passphrase.length) {
      const [iv, encrypted] = text.split(':').map(p => Buffer.from(p, encoding));
      let content = encrypted;
      const hash = crypto.createHash(hashAlgorithm);
      // AES-256 key length must be exactly 32 bytes
      const key = hash.update(passphrase).digest().subarray(0, 32);
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      content = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return Buffer.from(content, encoding).toString();
    } else {
      return text;
    }
  },

  /**
   * @function isEncrypted
   * A predicate function for determining if the input text is encrypted
   * @param {string} text The input string contents
   * @returns {boolean} True if encrypted, false if not
   */
  isEncrypted(text) {
    if (!text) return false;
    if (typeof text !== 'string') return false;
    const textParts = text.split(':');
    return (
      textParts.length == 2 &&
      textParts[0] &&
      textParts[1] &&
      textParts[0].length === 24 && // Base64 encoding of a 16 byte IV should be 24
      encodingCheck.test(textParts[0]) &&
      encodingCheck.test(textParts[1])
    );
  }
};

module.exports = crypt;
