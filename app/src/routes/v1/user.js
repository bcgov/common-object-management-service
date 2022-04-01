/* eslint-disable no-unused-vars */
const routes = require('express').Router();

const { userController } = require('../../controllers');
const { checkAppMode } = require('../../middleware/authorization');
const { requireDb } = require('../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);

/** Search for users */
routes.get('/', (req, res, next) => {
  userController.searchUsers(req, res, next);
});

module.exports = routes;
