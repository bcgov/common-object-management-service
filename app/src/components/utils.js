const Problem = require('api-problem');
const config = require('config');
const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

const { AuthMode, AuthType, DEFAULTREGION, MAXPARTCOUNT, MINPARTSIZE } = require('./constants');
const log = require('./log')(module.filename);

const DELIMITER = '/';

const utils = {
  /**
   * @function addDashesToUuid
   * Yields a lowercase uuid `str` that has dashes inserted, or `str` if not a string.
   * @param {string} str The input string uuid
   * @returns {string} The string `str` but with dashes inserted, or `str` if not a string.
   */
  addDashesToUuid(str) {
    if ((typeof str === 'string' || str instanceof String) && str.length === 32) {
      return `${str.slice(0, 8)}-${str.slice(8, 12)}-${str.slice(12, 16)}-${str.slice(16, 20)}-${str.slice(20)}`
        .toLowerCase();
    }
    else return str;
  },

  /**
   * @function calculatePartSize
   * Calculates the smallest feasible part size rounded to the nearest 5MB boundary
   * @param {number} length The incoming file length
   * @returns {number | undefined} The part size to use for this file length
   */
  calculatePartSize(length) {
    if (!length || typeof length !== 'number') return undefined;
    return Math.ceil(length / (MAXPARTCOUNT * MINPARTSIZE)) * MINPARTSIZE;
  },

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
   * @function getBucket
   * Acquire core S3 bucket credential information from database or configuration
   * @param {string} [bucketId=undefined] An optional bucket ID to query database for bucket
   * @returns {object} An object containing accessKeyId, bucket, endpoint, key,
   * region and secretAccessKey attributes
   * @throws If there are no records found with `bucketId` or, if `bucketId` is undefined,
   * no bucket details exist in the configuration
   */
  async getBucket(bucketId = undefined) {
    try {
      const data = { region: DEFAULTREGION };
      if (bucketId) {
        // Function scoped import to avoid circular dependencies
        const { read } = require('../services/bucket');
        const bucketData = await read(bucketId);

        data.accessKeyId = bucketData.accessKeyId;
        data.bucket = bucketData.bucket;
        data.endpoint = bucketData.endpoint;
        data.key = bucketData.key;
        data.secretAccessKey = bucketData.secretAccessKey;
        if (bucketData.region) data.region = bucketData.region;
      } else if (config.has('objectStorage') && config.has('objectStorage.enabled')) {
        data.accessKeyId = config.get('objectStorage.accessKeyId');
        data.bucket = config.get('objectStorage.bucket');
        data.endpoint = config.get('objectStorage.endpoint');
        data.key = config.get('objectStorage.key');
        data.secretAccessKey = config.get('objectStorage.secretAccessKey');
        if (config.has('objectStorage.region')) {
          data.region = config.get('objectStorage.region');
        }
      } else {
        throw new Error('Unable to get bucket');
      }
      return data;
    } catch (err) {
      log.error(err.message, { function: 'getBucket' });
      throw new Problem(404, { detail: err.message });
    }
  },

  /**
   * @function getBucketId
   * Gets the bucketId if object is in database
   * @param {string} objId The object id
   * @returns {Promise<string | undefined>} The bucketId
   */
  async getBucketId(objId) {
    let bucketId = undefined;
    // Function scoped import to avoid circular dependencies
    const { objectService } = require('../services');
    try {
      bucketId = (await objectService.read(objId)).bucketId;
    } catch (err) {
      log.verbose(`${err.message}. Using default bucketId instead.`, {
        function: 'getBucketId', objId: objId
      });
    }
    return bucketId;
  },

  /**
   * @function getCurrentIdentity
   * Attempts to acquire current identity value.
   * Always takes first non-default value available. Yields `defaultValue` otherwise.
   * @param {object} currentUser The express request currentUser object
   * @param {string} [defaultValue=undefined] An optional default return value
   * @returns {string} The current user identifier if applicable, or `defaultValue`
   */
  getCurrentIdentity(currentUser, defaultValue = undefined) {
    return utils.parseIdentityKeyClaims()
      .map(claim => utils.getCurrentTokenClaim(currentUser, claim, undefined))
      .filter(value => value) // Drop falsy values from array
      .concat(defaultValue)[0]; // Add defaultValue as last element of array
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
   * @function getGitRevision
   * Gets the current git revision hash
   * @see {@link https://stackoverflow.com/a/34518749}
   * @returns {string} The git revision hash, or empty string
   */
  getGitRevision() {
    try {
      const gitDir = (() => {
        let dir = '.git', i = 0;
        while (!existsSync(join(__dirname, dir)) && i < 5) {
          dir = '../' + dir;
          i++;
        }
        return dir;
      })();

      const head = readFileSync(join(__dirname, `${gitDir}/HEAD`)).toString().trim();
      return (head.indexOf(':') === -1)
        ? head
        : readFileSync(join(__dirname, `${gitDir}/${head.substring(5)}`)).toString().trim();
    } catch (err) {
      log.warn(err.message, { function: 'getGitRevision' });
      return '';
    }
  },

  /**
   * @function getKeyValue
   * Transforms arbitrary {<key>:<value>} objects to {key: <key>, value: <value>}
   * @param {object} input Arbitrary object containing key value attributes
   * @returns {object[]} Array of objects in the form of `{key: <key>, value: <value>}`
   */
  getKeyValue(input) {
    return Object.entries({ ...input }).map(([k, v]) => ({ key: k, value: v }));
  },

  /**
   * @function getMetadata
   * Derives metadata from a request header object
   * @param {object} obj The request headers to get key/value pairs from
   * @returns {object | undefined} An object with metadata key/value pair attributes or undefined
   */
  getMetadata(obj) {
    const metadata = Object.fromEntries(Object.keys(obj)
      .filter((key) => key.toLowerCase().startsWith('x-amz-meta-'))
      .map((key) => ([key.toLowerCase().substring(11), obj[key]]))
    );
    return Object.keys(metadata).length ? metadata : undefined;
  },

  /**
   * @function getObjectsByKeyValue
   * Get tag/metadata objects in array that have given key and value
   * @param {object[]} array an array of objects (eg: [{ key: 'a', value: '1'}, { key: 'b', value: '1'}]
   * @param {string} key the string to match in the objects's `key` property
   * @param {string} value the string to match in the objects's `value` property
   * @returns {object} the matching object, or undefined
   */
  getObjectsByKeyValue(array, key, value) {
    return array.find(obj => (obj.key === key && obj.value === value));
  },

  /**
   * @function getS3VersionId
   * Gets the s3VersionId from database using given internal COMS version id
   * or returns given s3VersionId
   * @param {string} s3VersionId S3 Version id
   * @param {string} versionId A COMS version id
   * @param {string} objectId The related COMS object id
   * @returns {Promise<string | undefined>} s3 Version id as string type or undefined
   */
  async getS3VersionId(s3VersionId, versionId, objectId) {
    let result = undefined;
    if (s3VersionId) {
      result = s3VersionId.toString();
    } else if (versionId) {
      const { versionService } = require('../services');
      const version = await versionService.get({ versionId: versionId, s3VersionId: undefined, objectId: objectId });
      if (version.s3VersionId) {
        result = version.s3VersionId;
      }
    }
    return result;
  },

  /**
   * @function getUniqueObjects
   * @param {object[]} arr array of objects
   * @param {string} key key of object property whose value we are comparing
   * @returns array of unique objects based on value of a given property
   */
  getUniqueObjects(array, key) {
    return [...new Map(array.map(item => [item[key], item])).values()];
  },

  /**
   * @function groupByObject
   * Re-structure array of nested objects
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce#grouping_objects_by_a_property}
   * @param {string} property key (or property accessor) to group by
   * @param {string} group attribute name for nested group
   * @param {object[]} objectArray array of objects
   * @returns {object[]} returns an array of Objects, each with nested group of objects
   */
  groupByObject(property, group, objectArray) {
    return objectArray.reduce((acc, obj) => {
      // value of the 'property' attribute of obj
      const val = obj[property];
      // does accumulator array have element with nested array containing current obj
      const el = acc.find((ob) => {
        return ob[group].some((p) => p[property] === val);
      });
      if (el) {
        // add to current element's nested array
        el[group].push(obj);
      } else {
        // add to a new top level element in accumulator array
        acc.push({ [property]: val, [group]: [obj] });
      }
      return acc;
    }, []);
  },

  /**
   * @function isAtPath
   * Predicate function determining if the `path` is a non-directory member of the `prefix` path
   * @param {string} prefix The base "folder"
   * @param {string} path The "file" to check
   * @returns {boolean} True if path is member of prefix. False in all other cases.
   */
  isAtPath(prefix, path) {
    if (typeof prefix !== 'string' || typeof path !== 'string') return false;
    if (prefix === path) return true; // Matching strings are always at the at the path
    if (path.endsWith(DELIMITER)) return false; // Trailing slashes references the folder

    const pathParts = path.split(DELIMITER).filter(part => part);
    const prefixParts = prefix.split(DELIMITER).filter(part => part);
    return prefixParts.every((part, i) => pathParts[i] === part)
      && pathParts.filter(part => !prefixParts.includes(part)).length === 1;
  },

  /**
   * @function isTruthy
   * Returns true if the element name in the object contains a truthy value
   * @param {object} value The object to evaluate
   * @returns {boolean} True if truthy, false if not, and undefined if undefined
   */
  isTruthy(value) {
    if (value === undefined) return value;

    const isStr = typeof value === 'string' || value instanceof String;
    const trueStrings = ['true', 't', 'yes', 'y', '1'];
    return value === true || value === 1 || isStr && trueStrings.includes(value.toLowerCase());
  },

  /**
   * @function joinPath
   * Joins a set of string arguments to yield a string path
   * @param  {...string} items The strings to join on
   * @returns {string} A path string with the specified delimiter
   */
  joinPath(...items) {
    if (items && items.length) {
      const parts = [];
      items.forEach(p => {
        if (p) p.split(DELIMITER).forEach(x => {
          if (x && x.trim().length) parts.push(x);
        });
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
   * @function parseIdentityKeyClaims
   * Returns an array of strings representing potential identity key claims
   * Array will always end with the last value as 'sub'
   * @returns {string[]} An array of string values, or `value` if it is not a string
   */
  parseIdentityKeyClaims() {
    const claims = [];
    if (config.has('keycloak.identityKey')) {
      claims.push(...utils.parseCSV(config.get('keycloak.identityKey')));
    }
    return claims.concat('sub');
  },

  /**
 * @function renameObjectProperty
 * Rename a property in given object
 * @param {object} obj The object with a property you are changing
 * @param {string} oldKey The property to rename
 * @param {string} newKey The new name for the property
 * @returns {object} the given object with property renamed
 */
  renameObjectProperty(obj, oldKey, newKey) {
    delete Object.assign(obj, { [newKey]: obj[oldKey] })[oldKey];
    return obj;
  },

  /**
   * @function streamToBuffer
   * Reads a Readable stream, writes to and returns an array buffer
   * @see {@link https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-755446927}
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
  },

  /**
   * @function stripDelimit
   * Yields a string `s` that will never have a trailing delimiter. Returns an empty string if falsy.
   * @param {string} s The input string
   * @returns {string} The string `s` without the trailing delimiter, or an empty string.
   */
  stripDelimit(s) {
    if (s) return s.endsWith(DELIMITER) ? utils.stripDelimit(s.slice(0, -1)) : s;
    else return '';
  },

  /**
   * @function toLowerKeys
   * Converts all key names for all objects in an array to lowercase
   * @param {object[]} arr Array of tag objects (eg: [{Key: k1, Value: V1}])
   * @returns {object[]} Array of objects (eg: [{key: k1, value: V1}]) or undefined if empty
   */
  toLowerKeys(arr) {
    if (!arr || !Array.isArray(arr)) return undefined;
    return arr.map(obj => {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => {
          return [key.toLowerCase(), value];
        }),
      );
    });
  },
};

module.exports = utils;
