const Problem = require('api-problem');
const compression = require('compression');
const config = require('config');
const cors = require('cors');
const express = require('express');
const { unless } = require('express-unless');
const { ValidationError } = require('express-validation');

const { AuthMode, DEFAULTCORS } = require('./src/components/constants');
const log = require('./src/components/log')(module.filename);
const httpLogger = require('./src/components/log').httpLogger;
const QueueManager = require('./src/components/queueManager');
const { getAppAuthMode, getGitRevision } = require('./src/components/utils');
const DataConnection = require('./src/db/dataConnection');
const v1Router = require('./src/routes/v1');

const dataConnection = new DataConnection();
const queueManager = new QueueManager();

const apiRouter = express.Router();
const state = {
  authMode: getAppAuthMode(),
  connections: {},
  gitRev: getGitRevision(),
  ready: false,
  shutdown: false
};

let probeId;
let queueId;

const app = express();
const jsonParser = express.json({ limit: config.get('server.bodyLimit') });
jsonParser.unless = unless;
app.use(compression());
app.use(cors(DEFAULTCORS));
app.use(jsonParser.unless({
  path: [{
    // Matches on only the createObject and updateObject endpoints
    url: /.*\/object(\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})?(\/)?$/i,
    methods: ['PUT']
  }]
}));
app.use(express.urlencoded({ extended: true }));

// Skip if running tests
if (process.env.NODE_ENV !== 'test') {
  // Initialize connections and exit if unsuccessful
  initializeConnections();
  app.use(httpLogger);
}

// Application authentication modes
switch (state.authMode) {
  case AuthMode.NOAUTH:
    log.info('Running COMS in public no-auth mode');
    break;
  case AuthMode.BASICAUTH:
    log.info('Running COMS in basic auth mode');
    break;
  case AuthMode.OIDCAUTH:
    log.info('Running COMS in oidc auth mode');
    break;
  case AuthMode.FULLAUTH:
    log.info('Running COMS in full (basic + oidc) auth mode');
    break;
}
if (state.authMode === AuthMode.OIDCAUTH || state.authMode === AuthMode.FULLAUTH) {
  if (!config.has('keycloak.publicKey')) {
    log.error('OIDC environment variable KC_PUBLICKEY or keycloak.publicKey must be defined');
    process.exitCode = 1;
    shutdown();
  }
}

// Application privacy Mode mode
if (config.has('server.privacyMask')) {
  log.info('Running COMS with strict content privacy masking');
} else {
  log.info('Running COMS with permissive content privacy masking');
}

// Block requests until service is ready
app.use((_req, res, next) => {
  if (state.shutdown) {
    new Problem(503, { details: 'Server is shutting down' }).send(res);
  } else if (!state.ready) {
    new Problem(503, { details: 'Server is not ready' }).send(res);
  } else {
    next();
  }
});

// Base API Directory
apiRouter.get('/', (_req, res) => {
  if (state.shutdown) {
    throw new Error('Server shutting down');
  } else {
    res.status(200).json({
      app: {
        authMode: state.authMode,
        gitRev: state.gitRev,
        name: process.env.npm_package_name,
        nodeVersion: process.version,
        privacyMask: config.has('server.privacyMask'),
        version: process.env.npm_package_version
      },
      endpoints: ['/api/v1'],
      versions: [1]
    });
  }
});

// v1 Router
apiRouter.use('/v1', v1Router);

// Root level Router
app.use(/(\/api)?/, apiRouter);

// Handle ValidationError & 500
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof Problem) {
    err.send(res);
  } else if (err instanceof ValidationError) {
    log.debug(err);
    return res.status(err.statusCode).json(err);
  } else {
    // Only log unexpected errors
    if (err.stack) log.error(err);

    new Problem(500, 'Server Error', {
      detail: (err.message) ? err.message : err
    }).send(res);
  }
});

// Handle 404
app.use((req, res) => {
  new Problem(404, 'Page Not Found', {
    detail: req.originalUrl
  }).send(res);
});

// Ensure unhandled errors gracefully shut down the application
process.on('unhandledRejection', err => {
  log.error(`Unhandled Rejection: ${err.message ?? err}`, { function: 'onUnhandledRejection' });
  fatalErrorHandler();
});
process.on('uncaughtException', err => {
  log.error(`Unhandled Exception: ${err.message ?? err}`, { function: 'onUncaughtException' });
  fatalErrorHandler();
});

// Graceful shutdown support
['SIGHUP', 'SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGUSR1', 'SIGUSR2']
  .forEach(signal => process.on(signal, shutdown));
process.on('exit', code => {
  log.info(`Exiting with code ${code}`, { function: 'onExit' });
});

/**
 * @function cleanup
 * Cleans up connections in this application.
 */
function cleanup() {
  log.info('Cleaning up', { function: 'cleanup' });
  // Set 10 seconds max deadline before hard exiting
  setTimeout(process.exit, 10000).unref(); // Prevents the timeout from registering on event loop

  clearInterval(probeId);
  clearInterval(queueId);
  queueManager.close(dataConnection.close(process.exit));
}

/**
 * @function checkConnections
 * Checks Database connectivity
 * This may force the application to exit if a connection fails
 */
function checkConnections() {
  const wasReady = state.ready;
  if (!state.shutdown) {
    dataConnection.checkConnection().then(results => {
      state.connections.data = results;
      state.ready = Object.values(state.connections).every(x => x);
      if (!wasReady && state.ready) log.info('Application ready to accept traffic', { function: 'checkConnections' });
      if (wasReady && !state.ready) log.warn('Application not ready to accept traffic', { function: 'checkConnections' });
      log.silly('App state', { function: 'checkConnections', state: state });
      if (!state.ready) notReadyHandler();
    });
  }
}

/**
 * @function fatalErrorHandler
 * Forces the application to shutdown
 */
function fatalErrorHandler() {
  process.exitCode = 1;
  shutdown();
}

/**
 * @function initializeConnections
 * Initializes the database connections
 * This may force the application to exit if it fails
 */
function initializeConnections() {
  // Initialize connections and exit if unsuccessful
  dataConnection.checkAll()
    .then(results => {
      state.connections.data = results;

      if (state.connections.data) {
        log.info('DataConnection Reachable', { function: 'initializeConnections' });
      }
    })
    .catch(error => {
      log.error(`Initialization failed: Database OK = ${state.connections.data}`, { function: 'initializeConnections' });
      log.error('Connection initialization failure', error.message, { function: 'initializeConnections' });
      if (!state.ready) notReadyHandler();
    })
    .finally(() => {
      state.ready = Object.values(state.connections).every(x => x);
      if (state.ready) log.info('Application ready to accept traffic', { function: 'initializeConnections' });

      // Start periodic 10 second connection probes
      probeId = setInterval(checkConnections, 10000);
      queueId = setInterval(() => {
        if (state.ready) queueManager.checkQueue();
      }, 10000);
    });
}

/**
 * @function notReadyHandler
 * Forces an application shutdown if `server.hardReset` is defined.
 * Otherwise will flush and attempt to reset the connection pool.
 */
function notReadyHandler() {
  if (config.has('server.hardReset')) fatalErrorHandler();
  else dataConnection.resetConnection();
}

/**
 * @function shutdown
 * Shuts down this application after at least 3 seconds.
 */
function shutdown() {
  log.info('Shutting down', { function: 'shutdown' });
  // Wait 3 seconds before starting cleanup
  if (!state.shutdown) {
    state.shutdown = true;
    log.info('Application no longer accepting traffic', { function: 'shutdown' });
    setTimeout(cleanup, 3000);
  }
}

module.exports = app;
