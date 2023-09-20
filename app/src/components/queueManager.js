const config = require('config');

const log = require('./log')(module.filename);
const { objectQueueService, syncService } = require('../services');

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
      this.isBusy = false;
      this._toClose = false;
      QueueManager._instance = this;
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
   * @function isBusy
   * @param {boolean} v The new state
   * Sets the isBusy state
   */
  set isBusy(v) {
    this._isBusy = v;
    if (!v && this.toClose) {
      log.info('No longer processing jobs', { function: 'isBusy' });
      if (this._cb) this._cb();
    }
  }

  /**
   * @function toClose
   * Gets the toClose state
   */
  get toClose() {
    return this._toClose;
  }

  /**
   * @function checkQueue
   * Checks the queue for any unprocessed jobs
   */
  checkQueue() {
    if (!this.isBusy && !this.toClose) {
      objectQueueService.queueSize().then(size => {
        if (size > 0) this.processNextJob();
      }).catch((err) => {
        log.error(`Error encountered while checking queue: ${err.message}`, { function: 'checkQueue', error: err });
      });
    }
  }

  /**
   * @function close
   * Stalls the callback until any remaining jobs are completed
   * @param {function} [cb] Optional callback
   */
  close(cb = undefined) {
    this._toClose = true;
    this._cb = cb;
    if (!this.isBusy) {
      log.info('No longer processing jobs', { function: 'close' });
      if (cb) cb();
    }
  }

  /**
   * @function processNextJob
   * Attempts to process the next job if available
   * @param {object} message A message object
   */
  async processNextJob() {
    let job;

    try {
      const response = await objectQueueService.dequeue();

      if (response.length) {
        this.isBusy = true;
        job = response[0];

        log.verbose(`Started processing job id ${job.id}`, { function: 'processNextJob', job: job });

        const objectId = await syncService.syncJob(job.path, job.bucketId, job.full, job.createdBy);

        log.verbose(`Finished processing job id ${job.id}`, { function: 'processNextJob', job: job, objectId: objectId });

        this.isBusy = false;
        // If job is completed, check if there are more jobs
        if (!this.toClose) this.checkQueue();
      }
    } catch (err) {
      log.error(`Error encountered on job id ${job.id}: ${err.message}`, { function: 'processNextJob', job: job, error: err });

      const maxRetries = parseInt(config.get('server.maxRetries'));
      if (job.retries + 1 > maxRetries) {
        log.warn(`Job has exceeded the ${maxRetries} maximum retries permitted`, { function: 'processNextJob', job: job, maxRetries: maxRetries });
      } else {
        objectQueueService.enqueue({
          jobs: [{ bucketId: job.bucketId, path: job.path }],
          full: job.full,
          retries: job.retries + 1,
          createdBy: job.createdBy
        }).then(() => {
          log.verbose('Job has been reenqueued', { function: 'processNextJob', job: job });
        }).catch((e) => {
          log.error(`Failed to reenqueue job id ${job.id}: ${e.message}`, { function: 'processNextJob', job: job });
        });
      }

      this.isBusy = false;
    }
  }
}

module.exports = QueueManager;
