const config = require('config');
const Keycloak = require('keycloak-connect');

const keycloakConfig = {
  bearerOnly: true,
  'confidential-port': 0,
  clientId: config.get('keycloak.clientId'),
  'policy-enforcer': {},
  realm: config.get('keycloak.realm'),
  secret: config.get('keycloak.clientSecret'),
  serverUrl: config.get('keycloak.serverUrl'),
  'ssl-required': 'external',
  'use-resource-role-mappings': false,
  'verify-token-audience': false
};

if (config.has('keycloak.publicKey')) {
  keycloakConfig.realmPublicKey = config.get('keycloak.publicKey');
}

module.exports = new Keycloak({}, keycloakConfig);
