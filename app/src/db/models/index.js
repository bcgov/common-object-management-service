const models = {
  // Tables
  IdentityProvider: require('./tables/identityProvider'),
  ObjectModel: require('./tables/objectModel'),
  ObjectPermission: require('./tables/objectPermission'),
  User: require('./tables/user'),

  // Views
};

module.exports = models;
