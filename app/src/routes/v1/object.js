const router = require('express').Router();

const { objectController } = require('../../controllers');
const { checkAppMode, } = require('../../middleware/authorization');
const { currentUpload } = require('../../middleware/upload');

router.use(checkAppMode);

/** test route */
router.put('/upload/', currentUpload(true), (req, res, next) => {


  // // --- set route request timeout of 5 hrs
  req.setTimeout(18000000);
  req.timeout = 18000000;
  req.requestTimeout = 18000000;

  // objectController.upload(req, res, next);
  objectController.upload(req, res, next);
});

module.exports = router;
