const Problem = require('api-problem');
const config = require('config');
const basicAuth = require('express-basic-auth');
const jwt = require('jsonwebtoken');

const { AuthType, DEFAULTREGION } = require('../components/constants');
const { getConfigBoolean } = require('../components/utils');
const { userService, storageService } = require('../services');


/**
 * Basic Auth configuration object
 * @see {@link https://github.com/LionC/express-basic-auth}
 */
const _basicAuthConfig = {
  // Must be a synchronous function
  authorizer: (username, password) => {
    const userMatch = basicAuth.safeCompare(username, config.get('basicAuth.username'));
    const pwMatch = basicAuth.safeCompare(password, config.get('basicAuth.password'));
    return userMatch & pwMatch;
  },
  unauthorizedResponse: () => {
    return new Problem(401, { detail: 'Invalid authorization credentials' });
  }
};

/**
 * An express middleware function that checks basic authentication validity
 * @see {@link https://github.com/LionC/express-basic-auth}
 */
const _checkBasicAuth = basicAuth(_basicAuthConfig);

/**
 * @function _spkiWrapper
 * Wraps an SPKI key with PEM header and footer
 * @param {string} spki The PEM-encoded Simple public-key infrastructure string
 * @returns {string} The PEM-encoded SPKI with PEM header and footer
 */
const _spkiWrapper = (spki) => `-----BEGIN PUBLIC KEY-----\n${spki}\n-----END PUBLIC KEY-----`;

/**
 * @function currentUser
 * Injects a currentUser object to the request if there exists valid authentication artifacts.
 * Subsequent logic should check `req.currentUser.authType` for authentication method if needed.
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 * @throws The error encountered upon failure
 */
const currentUser = async (req, res, next) => {
  const authorization = req.get('Authorization');
  const currentUser = {
    authType: AuthType.NONE
  };

  if (authorization) {
    // Basic Authorization
    if (authorization.toLowerCase().startsWith('basic ')) {
      currentUser.authType = AuthType.BASIC;
      if (getConfigBoolean('basicAuth.s3AccessMode')) {
        const amzEndpoint = req.get('x-amz-endpoint');
        const amzBucket = req.get('x-amz-bucket');

        // Ensure both 'x-amz-endpoint' and 'x-amz-bucket' are either both provided or both missing
        if ((amzEndpoint && !amzBucket) || (!amzEndpoint && amzBucket)) {
          return next(new Problem(400,
            { detail: 'Both x-amz-endpoint and x-amz-bucket must be provided together', instance: req.originalUrl }));
        }

        if (amzEndpoint && amzBucket) {
          try {
            // This will validate with s3 bucket endpoint
            const base64Credentials = authorization.split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
            const [accessKeyId, secretAccessKey] = credentials.split(':');

            const bucketSettings = {
              accessKeyId: accessKeyId,
              bucket: amzBucket,
              endpoint: amzEndpoint,
              region: credentials.region || DEFAULTREGION,
              secretAccessKey: secretAccessKey,
            };
            const bucketHeader = await storageService.headBucket(bucketSettings);

            if (bucketHeader?.$metadata?.httpStatusCode === 200) {
              await storageService.headBucket(bucketSettings);
              delete bucketSettings.secretAccessKey;
              currentUser.bucketSettings = bucketSettings;
            }
          } catch (err) {
            return next(new Problem(403, { detail: 'Invalid authorization credentials', instance: req.originalUrl }));
          }
        }
      }
    }

    // OIDC JWT Authorization
    else if (getConfigBoolean('keycloak.enabled') && authorization.toLowerCase().startsWith('bearer ')) {
      currentUser.authType = AuthType.BEARER;

      try {
        const bearerToken = authorization.substring(7);
        let isValid = false;

        if (config.has('keycloak.publicKey')) {
          const publicKey = config.get('keycloak.publicKey');
          const pemKey = publicKey.startsWith('-----BEGIN')
            ? publicKey
            : _spkiWrapper(publicKey);
          isValid = jwt.verify(bearerToken, pemKey, {
            issuer: `${config.get('keycloak.serverUrl')}/realms/${config.get('keycloak.realm')}`
          });
        } else {
          throw new Error('OIDC environment variable KC_PUBLICKEY or keycloak.publicKey must be defined');
        }

        if (isValid) {
          currentUser.tokenPayload = typeof isValid === 'object' ? isValid : jwt.decode(bearerToken);
          await userService.login(currentUser.tokenPayload);
        } else {
          throw new Error('Invalid authorization token');
        }
      } catch (err) {
        return next(new Problem(403, { detail: err.message, instance: req.originalUrl }));
      }
    }
  }

  // Inject currentUser data into request
  req.currentUser = Object.freeze(currentUser);

  // Continue middleware stack based on detected AuthType
  if (currentUser.authType === AuthType.BASIC && !currentUser?.bucketSettings) {
    _checkBasicAuth(req, res, next);
  }
  else next();
};

module.exports = {
  _basicAuthConfig, _checkBasicAuth, currentUser, _spkiWrapper
};
