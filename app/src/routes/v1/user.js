const routes = require('express').Router();

const { userController } = require('../../controllers');
const { checkAppMode } = require('../../middleware/authorization');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);
routes.use(requireSomeAuth);

/** Search for users */
routes.get('/', (req, res, next) => {
  // TODO: Add validation to ensure at least one query parameter is present
  // TODO: Add validation to reject unexpected query parameters
  userController.searchUsers(req, res, next);
});

/** List all identity providers */
routes.get('/idpList', (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  userController.listIdps(req, res, next);
});

module.exports = routes;
