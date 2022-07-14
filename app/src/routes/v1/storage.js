const routes = require('express').Router();
const { storageController } = require('../../controllers');
const { requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode } = require('../../middleware/authorization');

routes.use(checkAppMode);

/** */
routes.get('/encryption', requireSomeAuth, (req, res, next) => {
  storageController.getEncryption(req, res, next);
});

/** */
routes.patch('/encryption', requireSomeAuth, (req, res, next) => {
  storageController.putEncryption(req, res, next);
});


module.exports = routes;
