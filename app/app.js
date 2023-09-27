const Problem = require('api-problem');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const { ValidationError } = require('express-validation');

const { DEFAULTCORS } = require('./src/components/constants');
const log = require('./src/components/log')(module.filename);
const httpLogger = require('./src/components/log').httpLogger;
const { getAppAuthMode, getGitRevision } = require('./src/components/utils');
const v1Router = require('./src/routes/v1');

const apiRouter = express.Router();
const state = {
  authMode: getAppAuthMode(),
  connections: {},
  gitRev: getGitRevision(),
  ready: true,
  shutdown: false
};


const app = express();
app.use(compression());
app.use(cors(DEFAULTCORS));
app.use(express.urlencoded({ extended: true }));

// Skip if running tests
if (process.env.NODE_ENV !== 'test') {
  // Initialize connections and exit if unsuccessful
  // initializeConnections();
  app.use(httpLogger);
}

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
 * @function fatalErrorHandler
 * Forces the application to shutdown
 */
function fatalErrorHandler() {
  process.exitCode = 1;
  shutdown();
}


/**
 * @function shutdown
 * Begins the shutdown procedure for this application
 */
function shutdown() {
  log.info('Shutting down', { function: 'shutdown' });
  if (!state.shutdown) {
    state.shutdown = true;
    log.info('Application no longer accepting traffic', { function: 'shutdown' });
    process.exit(0);
  }
}

module.exports = app;
