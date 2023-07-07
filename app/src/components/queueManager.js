
const { Worker, isMainThread } = require('worker_threads');

const log = require('./log')(module.filename);
const { dequeue, queueSize } = require('../services/objectQueue');

/**
 * @class QueueManager
 * A singleton wrapper for managing the queue worker thread
 */
class QueueManager {
  /**
   * @constructor
   */
  constructor() {
    if (!QueueManager._instance) {
      QueueManager._instance = this;
      if (isMainThread) {
        this._isBusy = false;
        this._worker = new Worker('./src/components/queueWorker');
        this._worker.on('message', message => {
          this._isBusy = false;
          log.verbose('QueueManager received message', { msg: message });
          // If job is completed, check if there are more jobs
          this.checkQueue();
        });
        this._worker.on('error', (err) => {
          log.error(err);
          // TODO: Intercept and re-enqueue with retries++
        });
        this._worker.on('online', () => {
          log.info('QueueWorker online and ready for jobs', { threadId: this._worker.threadId });
        });
        this._worker.on('exit', (code) => {
          log.info('QueueWorker exited', { exitCode: code });
        });
      }
    }

    return QueueManager._instance;
  }

  /**
   * @function isBusy
   * Gets the isBusy state
   */
  get isBusy() {
    return this._isBusy;
  }

  /**
   * @function worker
   * Gets the current worker
   */
  get worker() {
    return this._worker;
  }

  /**
   * @function checkQueue
   * Checks Database connectivity
   */
  checkQueue() {
    queueSize().then(size => {
      if (!this._isBusy && size > 0) this.startNextJob();
    }).catch(() => { });
  }

  /**
   * @function close
   * Will close the worker
   * @param {function} [cb] Optional callback
   */
  close(cb = undefined) {
    this._worker.terminate().finally(() => {
      if (cb) cb();
    });
  }

  /**
   * @function startNextJob
   * Dispatches a message to the worker
   * @param {object} message A message object
   */
  startNextJob() {
    dequeue().then((response) => {
      if (response.length) {
        const job = response[0];
        this._isBusy = true;
        this._worker.postMessage({ bucketId: job.bucketId, path: job.path });
      }
    }).catch(() => { });
  }
}

module.exports = QueueManager;
