const router = require('express').Router();

// Base Responder
router.get('/', (_req, res) => {
  res.status(200).json({
    endpoints: [
      '/bucket',
      '/object'
    ]
  });
});

/** Bucket Permission Router */
router.use('/bucket', require('./bucketPermission'));

/** Object Permission Router */
router.use('/object', require('./objectPermission'));

module.exports = router;
