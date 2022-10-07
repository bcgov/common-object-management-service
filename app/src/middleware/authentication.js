const Problem = require('api-problem');
const config = require('config');
const basicAuth = require('express-basic-auth');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const { AuthType } = require('../components/constants');
const { userService } = require('../services');

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
 */
const currentUser = async (req, res, next) => {
  const authorization = req.get('Authorization');
  const currentUser = {
    authType: AuthType.NONE
  };

  if (authorization) {
    // Basic Authorization
    if (config.has('basicAuth.enabled') && authorization.toLowerCase().startsWith('basic ')) {
      currentUser.authType = AuthType.BASIC;
    }

    // OIDC JWT Validation
    else if (config.has('keycloak.enabled') && authorization.toLowerCase().startsWith('bearer ')) {
      currentUser.authType = AuthType.BEARER;

      try {
        const bearerToken = authorization.substring(7);

        // decode token
        const decodedJWT = jwt.decode(bearerToken);
        const issuer = decodedJWT.iss;
        // get public key from token issuer
        const realm = await axios.get(issuer);
        const publicKey = realm.data.public_key;
        // verify token using public key
        const isValid = jwt.verify(bearerToken, _spkiWrapper(publicKey), { issuer: `${decodedJWT.iss}` });

        if (isValid) {
          currentUser.tokenPayload = decodedJWT;
          await userService.login(currentUser.tokenPayload);
        } else {
          throw new Error('Invalid authorization token');
        }
      } catch (err) {
        return new Problem(403, { detail: err.message }).send(res);
      }
    }
  }

  // Inject currentUser data into request
  req.currentUser = Object.freeze(currentUser);

  // Continue middleware stack based on detected AuthType
  if (currentUser.authType === AuthType.BASIC) {
    _checkBasicAuth(req, res, next);
  }
  else next();
};

module.exports = {
  _basicAuthConfig, _checkBasicAuth, currentUser, _spkiWrapper
};
