const models = {
  // Tables
  IdentityProvider: require('./tables/identityProvider'),
  Object: require('./tables/object'),
  ObjectPermission: require('./tables/objectPermission'),
  User: require('./tables/user'),

  // Views
};

module.exports = models;
