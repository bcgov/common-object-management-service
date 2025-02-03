const Problem = require('api-problem');
const config = require('config');
const jwt = require('jsonwebtoken');

const { AuthType } = require('../components/constants');
const { getConfigBoolean } = require('../components/utils');
const { userService } = require('../services');


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
    // Basic Authorization (using s3 credentials)
    if (getConfigBoolean('basicAuth.enabled') && authorization.toLowerCase().startsWith('basic ')) {
      currentUser.authType = AuthType.BASIC;
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

  next();
};

module.exports = {
  currentUser, _spkiWrapper
};
