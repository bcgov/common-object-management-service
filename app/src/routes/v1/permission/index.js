const router = require('express').Router();

// Base Responder
router.get('/', (_req, res) => {
  res.status(200).json({
    endpoints: [
      '/bucket',
      '/invite',
      '/object'
    ]
  });
});

/** Bucket Permission Router */
router.use('/bucket', require('./bucketPermission'));

/** Invite Router */
router.use('/invite', require('./invite'));

/** Object Permission Router */
router.use('/object', require('./objectPermission'));

/** Bucket IDP Permission Router */
router.use('/idp/bucket', require('./bucketIdpPermission'));

/** Object IDP Permission Router */
router.use('/idp/object', require('./objectIdpPermission'));

module.exports = router;
