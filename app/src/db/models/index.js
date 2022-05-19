const models = {
  // Tables
  IdentityProvider: require('./tables/identityProvider'),
  Metadata: require('./tables/metadata'),
  ObjectModel: require('./tables/objectModel'),
  ObjectPermission: require('./tables/objectPermission'),
  Version: require('./tables/version'),
  VersionMetadata: require('./tables/versionMetadata'),
  Permission: require('./tables/permission'),
  User: require('./tables/user'),

  // Views
};

module.exports = models;
