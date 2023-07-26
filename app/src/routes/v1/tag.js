const router = require('express').Router();

const { tagController } = require('../../controllers');
const { tagValidator } = require('../../validators');
const { requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode } = require('../../middleware/authorization');

router.use(checkAppMode);
router.use(requireSomeAuth);

/** Search for tags */
router.get('/', tagValidator.searchTags, (req, res, next) => {
  tagController.searchTags(req, res, next);
});


module.exports = router;
