const models = {
  // Tables
  Bucket: require('./tables/bucket'),
  BucketPermission: require('./tables/bucketPermission'),
  IdentityProvider: require('./tables/identityProvider'),
  Invite: require('./tables/invite'),
  Metadata: require('./tables/metadata'),
  ObjectModel: require('./tables/objectModel'),
  ObjectPermission: require('./tables/objectPermission'),
  ObjectQueue: require('./tables/objectQueue'),
  Permission: require('./tables/permission'),
  Tag: require('./tables/tag'),
  User: require('./tables/user'),
  Version: require('./tables/version'),
  VersionMetadata: require('./tables/versionMetadata'),
  VersionTag: require('./tables/versionTag'),

  // Views
};

module.exports = models;
