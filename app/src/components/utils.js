
const config = require('config');

const { AuthMode } = require('./constants');

const DELIMITER = '/';

const utils = {
  /**
   * @function delimit
   * Yields a string `s` that will always have a trailing delimiter. Returns an empty string if falsy.
   * @param {string} s The input string
   * @returns {string} The string `s` with the trailing delimiter, or an empty string.
   */
  delimit(s) {
    if (s) {
      return s.endsWith(DELIMITER) ? s : `${s}${DELIMITER}`;
    }
    return '';
  },

  /**
   * @function getAppAuthMode
   * Yields the current `AuthMode` this application is operating under.
   * @returns {string} The application AuthMode
   */
  getAppAuthMode() {
    const basicAuth = config.has('basicAuth.enabled');
    const oidcAuth = config.has('keycloak.enabled');

    if (!basicAuth && !oidcAuth) return AuthMode.NOAUTH;
    if (basicAuth && !oidcAuth) return AuthMode.BASICAUTH;
    if (!basicAuth && oidcAuth) return AuthMode.OIDCAUTH;
    if (basicAuth && oidcAuth) return AuthMode.FULLAUTH;
  },

  /**
   * @function getPath
   * Gets the relative path of `objId`
   * @param {string} objId The object id
   * @returns {string} The path
   */
  getPath(objId) {
    const key = utils.delimit(config.get('objectStorage.key'));
    return utils.join(key, objId);
  },

  /**
   * @function join
   * Joins a set of string arguments to yield a string path
   * @param  {...string} items The strings to join on
   * @returns {string} A path string with the specified delimiter
   */
  join(...items) {
    if (items && items.length) {
      const parts = [];
      items.map(p => {
        if (p) {
          p.split('/').map(x => {
            if (x && x.trim().length) parts.push(x);
          });
        }
      });
      return parts.join(DELIMITER);
    }
    return '';
  },

  /**
   * @function streamToBuffer
   * Reads a Readable stream, writes to and returns an array buffer
   * @see https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-755446927
   * @param {Readable} stream A readable stream object
   * @returns {array} A buffer usually formatted as an Uint8Array
   */
  streamToBuffer(stream) { // Readable
    return new Promise((resolve, reject) => {
      const chunks = []; // Uint8Array[]
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
};

module.exports = utils;
