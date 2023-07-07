const { NIL: SYSTEM_USER } = require('uuid');

const { ObjectQueue } = require('../db/models');

/**
 * The Object Queue DB Service
 */
const service = {
  /**
   * @function dequeue
   * Removes a job from the object queue.
   * @param {object} [etrx=undefined] Optional Objection Transaction object
   * @returns {Promise<ObjectQueue | null>} An ObjectQueue if available.
   */
  async dequeue(etrx = undefined) {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectQueue.startTransaction();

      const response = await ObjectQueue.query(trx)
        .modify('findNextJob')
        .delete()
        // Returns array of deleted rows instead of count
        // https://vincit.github.io/objection.js/recipes/returning-tricks.html
        .returning('*');

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function enqueue
   * Adds a set of jobs to the object queue. If the same job already exists, the existing
   * job will take precedence and will not be reinserted.
   * @param {object[]} options.jobs An array of job objects typically containing `path` and `bucketId` attributes
   * @param {boolean} [options.full=false] Optional boolean indicating whether to execute full recursive run
   * @param {integer} [options.retries=0] Optional integer indicating how many previous retries this job has had
   * @param {string} [options.createdBy=SYSTEM_USER] Optional uuid attributing which user added the job
   * @param {object} [etrx=undefined] Optional Objection Transaction object
   * @returns {Promise<integer>} Number of records added to the queue
   */
  async enqueue({ jobs = [], full = false, retries = 0, createdBy = SYSTEM_USER } = {}, etrx = undefined) {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectQueue.startTransaction();

      const jobsArray = jobs.map(job => ({
        bucketId: job.bucketId,
        path: job.path,
        full: full,
        retries: retries,
        createdBy: createdBy
      }));

      // Short circuit when nothing to add or there are missing paths
      if (!jobsArray.length || !jobsArray.every(job => !!job.path)) return Promise.resolve(0);

      // Only insert jobs in if it does not already exist
      const response = await ObjectQueue.query(trx).insert(jobsArray).onConflict().ignore();

      if (!etrx) await trx.commit();
      return Promise.resolve(response.reduce((acc, job) => job?.id ? acc + 1 : acc, 0));
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function queueSize
   * Returns the number of jobs currently waiting for processing in the object queue.
   * @returns {Promise<number>} An integer representing how many jobs are in the queue.
   */
  async queueSize() {
    return ObjectQueue.query().count().first()
      .then(response => parseInt(response.count));
  },
};

module.exports = service;
