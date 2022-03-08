const models = {
  // Tables
  IdentityProvider: require('./tables/identityProvider'),
  ObjectModel: require('./tables/objectModel'),
  ObjectPermission: require('./tables/objectPermission'),
  Permission: require('./tables/permission'),
  User: require('./tables/user'),

  // Views
};

module.exports = models;
