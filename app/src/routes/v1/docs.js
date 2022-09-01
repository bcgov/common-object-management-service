const config = require('config');
const routes = require('express').Router();
const { readFileSync } = require('fs');
const yaml = require('js-yaml');
const { join } = require('path');

/** Gets the OpenAPI specification */
function getSpec() {
  const rawSpec = readFileSync(join(__dirname, '../../docs/v1.api-spec.yaml'), 'utf8');
  const spec = yaml.load(rawSpec);
  spec.servers[0].url = '/api/v1';
  if (config.has('keycloak.enabled')) {
    spec.components.securitySchemes.OpenID.openIdConnectUrl = `${config.get('keycloak.serverUrl')}/realms/${config.get('keycloak.realm')}/.well-known/openid-configuration`;
  }
  return spec;
}

/** OpenAPI Docs */
routes.get('/', (_req, res) => {
  const docs = require('../../docs/docs');
  res.send(docs.getDocHTML('v1'));
});

/** OpenAPI YAML Spec */
routes.get('/api-spec.yaml', (_req, res) => {
  res.status(200).type('application/yaml').send(yaml.dump(getSpec()));
});

/** OpenAPI JSON Spec */
routes.get('/api-spec.json', (_req, res) => {
  res.status(200).json(getSpec());
});

module.exports = routes;
