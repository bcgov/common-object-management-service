const router = require('express').Router();
const { currentUser } = require('../../middleware/authentication');

router.use(currentUser);

// Base v1 Responder
router.get('/', (_req, res) => {
  res.status(200).json({
    endpoints: [
      '/bucket',
      '/docs',
      '/metadata',
      '/object',
      '/permission',
      '/user',
      '/version'
    ]
  });
});

/** Bucket Router */
router.use('/bucket', require('./bucket'));

/** Documentation Router */
router.use('/docs', require('./docs'));

/** Metadata Router */
router.use('/metadata', require('./metadata'));

/** Object Router */
router.use('/object', require('./object'));

/** Permission Router */
router.use('/permission', require('./permission'));

/** User Router */
router.use('/user', require('./user'));

/** Version Router */
router.use('/version', require('./version'));

module.exports = router;
