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
      '/sync',
      '/tagging',
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

/** Sync Router */
router.use('/sync', require('./sync'));

/** Tagging Router */
router.use('/tagging', require('./tag'));

/** User Router */
router.use('/user', require('./user'));

/** Version Router */
router.use('/version', require('./version'));

module.exports = router;
