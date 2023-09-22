const router = require('express').Router();

const { objectController } = require('../../controllers');
const { checkAppMode, } = require('../../middleware/authorization');
const { currentUpload } = require('../../middleware/upload');

router.use(checkAppMode);

/** test route */
router.put('/upload/', currentUpload(true), (req, res, next) => {
  objectController.upload(req, res, next);
});

module.exports = router;
