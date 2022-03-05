
const config = require('config');

const { AuthMode, AuthType } = require('./constants');

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
   * @function getCurrentOidcId
   * Attempts to acquire current user oidcId. Yields `defaultValue` otherwise
   * @param {object} currentUser The express request currentUser object
   * @param {string} [defaultValue=undefined] An optional default return value
   * @returns {string} The current user oidcId if applicable, or `defaultValue`
   */
  getCurrentOidcId(currentUser, defaultValue = undefined) {
    return (currentUser && currentUser.authType === AuthType.BEARER)
      ? currentUser.tokenPayload.sub
      : defaultValue;
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
   * @function mixedQueryToArray
   * Standardizes query params to yield an array of unique string values
   * @param {string|string[]} param The query param to process
   * @returns {string[]} A unique array of string values
   */
  mixedQueryToArray(param) {
    // Short circuit undefined if param is falsy
    if (!param) return undefined;

    const result = (Array.isArray(param))
      ? param.flatMap(p => utils.parseCSV(p))
      : utils.parseCSV(param);

    // Return unique values
    return [...new Set(result)];
  },

  /**
   * @function parseCSV
   * Converts a comma separated value string into an array of string values
   * @param {string} value The CSV string to parse
   * @returns {string[]} An array of string values, or `value` if it is not a string
   */
  parseCSV(value) {
    return (typeof value === 'string' || value instanceof String)
      ? value.split(',').map(s => s.trim())
      : value;
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
