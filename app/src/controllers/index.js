module.exports = {
  bucketController: require('./bucket'),
  bucketPermissionController: require('./bucketPermission'),
  bucketIdpPermissionController: require('./bucketIdpPermission'),
  inviteController: require('./invite'),
  metadataController: require('./metadata'),
  objectController: require('./object'),
  objectPermissionController: require('./objectPermission'),
  objectIdpPermissionController: require('./objectIdpPermission'),
  syncController: require('./sync'),
  userController: require('./user'),
  tagController: require('./tag'),
  versionController: require('./version')
};
