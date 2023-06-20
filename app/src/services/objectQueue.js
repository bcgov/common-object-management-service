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
   * Adds a job to the object queue. If the same job already exists, the existing
   * job will take precedence and will not be reinserted.
   * @param {string} path The canonical object path
   * @param {string} [bucketId=undefined] Optional associated bucketId
   * @param {boolean} [full=false] Optional boolean indicating whether to execute full recursive run
   * @param {integer} [retries=0] Optional integer indicating how many previous retries this job has had
   * @param {string} [createdBy=SYSTEM_USER] Optional uuid attributing which user added the job
   * @param {object} [etrx=undefined] Optional Objection Transaction object
   * @returns {Promise<boolean>} True if enqueued; false otherwise.
   */
  async enqueue(path, bucketId = undefined, full = false, retries = 0, createdBy = SYSTEM_USER, etrx = undefined) {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectQueue.startTransaction();

      // Only insert job in if it does not already exist in
      const response = await ObjectQueue.query(trx).insert({
        bucketId: bucketId,
        path: path,
        full: full,
        retries: retries,
        createdBy: createdBy
      }).onConflict().ignore();

      if (!etrx) await trx.commit();
      return Promise.resolve(!!response.id);
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
