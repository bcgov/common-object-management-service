const routes = require('express').Router();

const { userValidator } = require('../../validator');
const { userController } = require('../../controllers');
const { checkAppMode } = require('../../middleware/authorization');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);
routes.use(requireSomeAuth);


/** Search for users */
routes.get('/', userValidator.searchUsers, (req, res, next) => {
  userController.searchUsers(req, res, next);
});

/** List all identity providers */
routes.get('/idpList', userValidator.listIdps, (req, res, next) => {
  userController.listIdps(req, res, next);
});

module.exports = routes;
