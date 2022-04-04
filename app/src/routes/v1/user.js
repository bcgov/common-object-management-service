/* eslint-disable no-unused-vars */
const routes = require('express').Router();

const { userController } = require('../../controllers');
const { checkAppMode } = require('../../middleware/authorization');
const { requireDb } = require('../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);

/** Search for users */
routes.get('/', (req, res, next) => {
  // TODO: Add validation to ensure at least one query parameter is present
  userController.searchUsers(req, res, next);
});

/** List all identity providers */
routes.get('/idpList', (req, res, next) => {
  userController.listIdps(req, res, next);
});

module.exports = routes;
