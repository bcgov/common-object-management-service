const express = require('express');
const router = express.Router();

const { inviteController } = require('../../../controllers');
// const { inviteValidator } = require('../../../validators');
// const { checkAppMode, currentObject, hasPermission } = require('../../../middleware/authorization');
const { requireSomeAuth } = require('../../../middleware/featureToggle');

// router.use(checkAppMode);
router.use(requireSomeAuth);

/** Search for bucket permissions */
router.post('/', express.json(), (req, res, next) => {
  inviteController.createInvite(req, res, next);
});

/** Returns the bucket permissions */
router.get('/:token', (req, res, next) => {
  inviteController.useInvite(req, res, next);
});

module.exports = router;
