const config = require('config');
const crypto = require('crypto');

// GCM mode is good for situations with random access and authenticity requirements
// CBC mode is older, but is sufficiently secure with high performance for short payloads
const algorithm = 'aes-256-cbc';
const encoding = 'base64';
const hashAlgorithm = 'sha256';

const crypt = {
  /**
   * @function encrypt
   * Yields an encrypted string containing the iv and ciphertext, separated by a colon.
   * If no key is provided, ciphertext will be the plaintext in base64 encoding.
   * @param {string} plaintext The input string contents
   * @returns {string} The encrypted base64 formatted string in the format `iv:ciphertext`.
   */
  encrypt(plaintext) {
    const passphrase = config.has('server.passphrase') ? config.get('server.passphrase') : undefined;
    const iv = crypto.randomBytes(16);
    let content = Buffer.from(plaintext);

    if (passphrase && passphrase.length) {
      const hash = crypto.createHash(hashAlgorithm);
      // AES-256 key length must be exactly 32 bytes
      const key = hash.update(passphrase).digest().subarray(0, 32);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      content = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    }
    return `${iv.toString(encoding)}:${content.toString(encoding)}`;
  },

  /**
   * @function decrypt
   * Yields the plaintext by accepting an encrypted string containing the iv and
   * ciphertext, separated by a colon. If no key is provided, the plaintext will be
   * the ciphertext.
   * @param {string} ciphertext The input encrypted string contents
   * @returns {string} The decrypted plaintext string, usually in utf-8
   */
  decrypt(ciphertext) {
    const passphrase = config.has('server.passphrase') ? config.get('server.passphrase') : undefined;
    const [iv, encrypted] = ciphertext.split(':').map(p => Buffer.from(p, encoding));
    let content = encrypted;

    if (passphrase && passphrase.length) {
      const hash = crypto.createHash(hashAlgorithm);
      // AES-256 key length must be exactly 32 bytes
      const key = hash.update(passphrase).digest().subarray(0, 32);
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      content = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }
    return Buffer.from(content, encoding).toString();
  }
};

module.exports = crypt;
