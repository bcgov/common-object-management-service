const compression = require('compression');
const config = require('config');
const cors = require('cors');
const express = require('express');
const Problem = require('api-problem');

const keycloak = require('./src/components/keycloak');
const log = require('./src/components/log')(module.filename);
const httpLogger = require('./src/components/log').httpLogger;
const v1Router = require('./src/routes/v1');

const DataConnection = require('./src/db/dataConnection');
const dataConnection = new DataConnection();

const apiRouter = express.Router();
const state = {
  connections: {
    data: false
  },
  ready: false,
  shutdown: false
};
let probeId;

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json({ limit: config.get('server.bodyLimit') }));
app.use(express.urlencoded({ extended: true }));

// Skip if running tests
if (process.env.NODE_ENV !== 'test') {
  // Initialize connections and exit if unsuccessful
  initializeConnections();
  app.use(httpLogger);
}

// Use Keycloak OIDC Middleware
if (config.has('keycloak.enabled')) {
  log.info('Running in authenticated mode');
  app.use(keycloak.middleware());
} else {
  log.info('Running in public mode');
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
      endpoints: ['/api/v1'],
      versions: [1]
    });
  }
});

// v1 Router
apiRouter.use('/v1', v1Router);

// Root level Router
app.use(/(\/api)?/, apiRouter);

// Handle 500
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof Problem) {
    err.send(res);
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

// Prevent unhandled errors from crashing application
process.on('unhandledRejection', err => {
  if (err && err.stack) {
    log.error(err);
  }
});

// Graceful shutdown support
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGUSR1', shutdown);
process.on('SIGUSR2', shutdown);
process.on('exit', () => {
  log.info('Exiting...');
});

/**
 * @function shutdown
 * Shuts down this application after at least 3 seconds.
 */
function shutdown() {
  log.info('Received kill signal. Shutting down...');
  // Wait 3 seconds before starting cleanup
  if (!state.shutdown) setTimeout(cleanup, 3000);
}

/**
 * @function cleanup
 * Cleans up connections in this application.
 */
function cleanup() {
  log.info('Service no longer accepting traffic', { function: 'cleanup' });
  state.shutdown = true;

  log.info('Cleaning up...', { function: 'cleanup' });
  clearInterval(probeId);

  dataConnection.close(() => process.exit());

  // Wait 10 seconds max before hard exiting
  setTimeout(() => process.exit(), 10000);
}

/**
 * @function initializeConnections
 * Initializes the database connections
 * This will force the application to exit if it fails
 */
function initializeConnections() {
  // Initialize connections and exit if unsuccessful
  const tasks = [
    dataConnection.checkAll()
  ];

  Promise.all(tasks)
    .then(results => {
      state.connections.data = results[0];

      if (state.connections.data) log.info('DataConnection Reachable', { function: 'initializeConnections' });
    })
    .catch(error => {
      log.error(`Initialization failed: Database OK = ${state.connections.data}`, { function: 'initializeConnections' });
      log.error('Connection initialization failure', error.message, { function: 'initializeConnections' });
      if (!state.ready) {
        process.exitCode = 1;
        shutdown();
      }
    })
    .finally(() => {
      state.ready = Object.values(state.connections).every(x => x);
      if (state.ready) {
        log.info('Service ready to accept traffic', { function: 'initializeConnections' });
        // Start periodic 10 second connection probe check
        probeId = setInterval(checkConnections, 10000);
      }
    });
}

/**
 * @function checkConnections
 * Checks Database connectivity
 * This will force the application to exit if a connection fails
 */
function checkConnections() {
  const wasReady = state.ready;
  if (!state.shutdown) {
    const tasks = [
      dataConnection.checkConnection()
    ];

    Promise.all(tasks).then(results => {
      state.connections.data = results[0];
      state.ready = Object.values(state.connections).every(x => x);
      if (!wasReady && state.ready) log.info('Service ready to accept traffic', { function: 'checkConnections' });
      log.verbose(state);
      if (!state.ready) {
        process.exitCode = 1;
        shutdown();
      }
    });
  }
}

module.exports = app;
