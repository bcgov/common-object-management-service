module.exports = {
  bucketValidator: require('./bucket'),
  bucketPermissionValidator: require('./bucketPermission'),
  bucketIdpPermissionValidator: require('./bucketIdpPermission'),
  inviteValidator: require('./invite'),
  metadataValidator: require('./metadata'),
  objectValidator: require('./object'),
  objectPermissionValidator: require('./objectPermission'),
  objectIdpPermissionValidator: require('./objectIdpPermission'),
  syncValidator: require('./sync'),
  tagValidator: require('./tag'),
  userValidator: require('./user'),
  versionValidator: require('./version'),
};
