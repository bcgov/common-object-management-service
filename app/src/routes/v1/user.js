const routes = require('express').Router();

const { searchValidation, idpListValidation } = require('../../validation/user');
const { userController } = require('../../controllers');
const { checkAppMode } = require('../../middleware/authorization');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);
routes.use(requireSomeAuth);


/** Search for users */
routes.get('/', searchValidation, (req, res, next) => {
  userController.searchUsers(req, res, next);
});

/** List all identity providers */
// eslint-disable-next-line no-unused-vars
routes.get('/idpList', idpListValidation, (req, res, next) => {
  userController.listIdps(req, res, next);
});

module.exports = routes;
