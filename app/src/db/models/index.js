const models = {
  // Tables
  IdentityProvider: require('./tables/identityProvider'),
  Object: require('./tables/object'),
  ObjectPermission: require('./tables/objectPermission'),
  OidcUser: require('./tables/oidcUser'),

  // Views
};

module.exports = models;
