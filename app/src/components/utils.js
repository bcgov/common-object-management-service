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
    if (s) return s.endsWith(DELIMITER) ? s : `${s}${DELIMITER}`;
    else return '';
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
    else if (basicAuth && !oidcAuth) return AuthMode.BASICAUTH;
    else if (!basicAuth && oidcAuth) return AuthMode.OIDCAUTH;
    else return AuthMode.FULLAUTH; // basicAuth && oidcAuth
  },

  /**
   * @function getCurrentIdentity
   * Attempts to acquire current identity. Yields `defaultValue` otherwise
   * @param {object} currentUser The express request currentUser object
   * @param {string} [defaultValue=undefined] An optional default return value
   * @returns {string} The current user identifier if applicable, or `defaultValue`
   */
  getCurrentIdentity(currentUser, defaultValue = undefined) {
    const claim = config.has('keycloak.identityKey') ? config.get('keycloak.identityKey') : 'sub';
    return utils.getCurrentTokenClaim(currentUser, claim, defaultValue);
  },

  /**
   * @function getCurrentSubject
   * Attempts to acquire current subject id. Yields `defaultValue` otherwise
   * @param {object} currentUser The express request currentUser object
   * @param {string} [defaultValue=undefined] An optional default return value
   * @returns {string} The current subject id if applicable, or `defaultValue`
   */
  getCurrentSubject(currentUser, defaultValue = undefined) {
    return utils.getCurrentTokenClaim(currentUser, 'sub', defaultValue);
  },

  /**
   * @function getCurrentTokenClaim
   * Attempts to acquire a specific current token claim. Yields `defaultValue` otherwise
   * @param {object} currentUser The express request currentUser object
   * @param {string} claim The requested token claim
   * @param {string} [defaultValue=undefined] An optional default return value
   * @returns {object} The requested current token claim if applicable, or `defaultValue`
   */
  getCurrentTokenClaim(currentUser, claim, defaultValue = undefined) {
    return (currentUser && currentUser.authType === AuthType.BEARER)
      ? currentUser.tokenPayload[claim]
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
    else return '';
  },

  /**
   * @function mixedQueryToArray
   * Standardizes query params to yield an array of unique string values
   * @param {string|string[]} param The query param to process
   * @returns {string[]} A unique, non-empty array of string values, or undefined if empty
   */
  mixedQueryToArray(param) {
    // Short circuit undefined if param is falsy
    if (!param) return undefined;

    const parsed = (Array.isArray(param))
      ? param.flatMap(p => utils.parseCSV(p))
      : utils.parseCSV(param);
    const unique = [...new Set(parsed)];

    return unique.length ? unique : undefined;
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
   * @returns {Buffer} A buffer usually formatted as an Uint8Array
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
