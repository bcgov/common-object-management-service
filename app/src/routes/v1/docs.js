const config = require('config');
const router = require('express').Router();
const { readFileSync } = require('fs');
const helmet = require('helmet');
const yaml = require('js-yaml');
const { join } = require('path');
const { getConfigBoolean } = require('../../components/utils');

/** Gets the OpenAPI specification */
function getSpec() {
  const rawSpec = readFileSync(join(__dirname, '../../docs/v1.api-spec.yaml'), 'utf8');
  const spec = yaml.load(rawSpec);
  spec.servers[0].url = '/api/v1';
  if (getConfigBoolean('keycloak.enabled')) {
    // eslint-disable-next-line max-len
    spec.components.securitySchemes.OpenID.openIdConnectUrl = `${config.get('keycloak.serverUrl')}/realms/${config.get('keycloak.realm')}/.well-known/openid-configuration`;
  }
  return spec;
}

router.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ['data:', 'https://cdn.redoc.ly'],
        'script-src': ['blob:', 'https://cdn.redoc.ly']
      }
    }
  })
);

/** OpenAPI Docs */
router.get('/', (_req, res) => {
  const docs = require('../../docs/docs');
  res.send(docs.getDocHTML('v1'));
});

/** OpenAPI YAML Spec */
router.get('/api-spec.yaml', (_req, res) => {
  res.status(200).type('application/yaml').send(yaml.dump(getSpec()));
});

/** OpenAPI JSON Spec */
router.get('/api-spec.json', (_req, res) => {
  res.status(200).json(getSpec());
});

module.exports = router;
