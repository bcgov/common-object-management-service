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
      this._isBusy = false;
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
   * Spinlock until any remaining jobs are completed
   * @param {function} [cb] Optional callback
   */
  close(cb = undefined) {
    this._toClose = true;
    if (this.isBusy) setTimeout(this.close(cb), 250);
    else {
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
        job = response[0];
        this._isBusy = true;

        log.verbose(`Started processing job id ${job.id}`, { function: 'processNextJob', job: job });

        const result = await syncService.syncJob({
          bucketId: job.bucketId,
          path: job.path,
          full: job.full,
          userId: job.createdBy
        });

        this._isBusy = false;
        log.verbose(`Finished processing job id ${job.id}`, { function: 'processNextJob', job: job, result: result });

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

      this._isBusy = false;
    }
  }
}

module.exports = QueueManager;
