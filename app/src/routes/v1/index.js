const router = require('express').Router();
const { currentUser } = require('../../middleware/authentication');

router.use(currentUser);

// Base v1 Responder
router.get('/', (_req, res) => {
  res.status(200).json({
    endpoints: [
      '/docs',
      '/object',
      '/permission',
      '/storage',
      '/user'
    ]
  });
});

/** Documentation Router */
router.use('/docs', require('./docs'));

/** Object Router */
router.use('/object', require('./object'));

/** Permission Router */
router.use('/permission', require('./permission'));

/** Storage Router */
router.use('/storage', require('./storage'));

/** User Router */
router.use('/user', require('./user'));

module.exports = router;
