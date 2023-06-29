const { parentPort } = require('worker_threads');

const log = require('./log')(module.filename);

/**
 * The Queue Worker Component
 */
const queueWorker = {
  /**
   * @function onMessage
   * Handles a message sent to the worker thread to perform some work
   * @param {object} message An object message
   */
  onMessage(message) {
    log.verbose('synchronizeJob', { workerData: message });
    const { bucketId, path } = message;

    // TODO: Replace with syncService.synchronizeJob
    setTimeout(() => {
      const msg = 'fake job done';
      log.verbose(msg, { jobData: { bucketId: bucketId, path: path } });
      parentPort.postMessage(msg);
    }, 2000);
  }
};

parentPort.on('message', message => queueWorker.onMessage(message));

module.exports = queueWorker;
