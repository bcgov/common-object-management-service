const express = require('express');
const router = express.Router();

const { inviteController } = require('../../../controllers');
const { inviteValidator } = require('../../../validators');
const { checkS3BasicAccess, checkElevatedUser } = require('../../../middleware/authorization');
const { requireBearerAuth, requireSomeAuth } = require('../../../middleware/featureToggle');

router.use(requireSomeAuth);

/** Creates an invitation token */
router.post('/',
  express.json(),
  inviteValidator.createInvite,
  checkS3BasicAccess,
  checkElevatedUser,
  (req, res, next) => {
    inviteController.createInvite(req, res, next);
  });

/** Uses an invitation token */
router.get('/:token',
  requireBearerAuth,
  inviteValidator.useInvite,
  (req, res, next) => {
    inviteController.useInvite(req, res, next);
  });

module.exports = router;
