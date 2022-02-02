const Problem = require('api-problem');

const keycloak = require('../keycloak');
const service = require('../user/service');

const getToken = req => {
  try {
    return req.kauth.grant.access_token;
  } catch (err) {
    return null;
  }
};

const setUser = async (req, _res, next) => {
  const token = getToken(req);
  req.currentUser = await service.login(token);
  next();
};

const currentUser = async (req, res, next) => {
  // Check if authorization header is a bearer token
  if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    // need to check keycloak, ensure the bearer token is valid
    const token = req.headers.authorization.substring(7);
    const ok = await keycloak.grantManager.validateAccessToken(token);
    if (!ok) {
      return new Problem(403, { detail: 'Authorization token is invalid.' }).send(res);
    }
  }

  return setUser(req, res, next);
};

module.exports = {
  currentUser
};
