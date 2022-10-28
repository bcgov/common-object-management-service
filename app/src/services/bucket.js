// const { Permissions } = require('../components/constants');
const { Bucket } = require('../db/models');

/**
 * The Bucket DB Service
 */
const service = {
  /**
   * @function create
   * Create a bucket record and give the uploader (if authed) permissions
   * @param {string} data.bucketId The bucket uuid
   * @param {string} data.bucketName The user-defined bucket name identifier
   * @param {string} data.accessKeyId The S3 bucket access key id
   * @param {string} data.bucket The S3 bucket identifier
   * @param {string} data.endpoint The S3 bucket endpoint
   * @param {string} data.key The relative S3 key/subpath managed by this bucket
   * @param {string} data.secretAccessKey The S3 bucket secret access key
   * @param {boolean} [data.active] The optional active flag - defaults to true if undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  create: async (data, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Bucket.startTransaction();

      // Add bucket record to DB
      const obj = {
        bucketId: data.bucketId,
        bucketName: data.bucketName,
        accessKeyId: data.accessKeyId,
        bucket: data.bucket,
        endpoint: data.endpoint,
        key: data.key,
        secretAccessKey: data.secretAccessKey,
        active: data.active,
        createdBy: data.userId
      };

      // TODO: Add conflict/merge logic to avoid bucket duplicates?

      const response = await Bucket.query(trx).insert(obj).returning('*');

      // TODO: Add permissions when all fields match?
      // Add all permission codes for the uploader
      // if (data.userId) {
      //   const perms = Bucket.values(Permissions).map((p) => ({
      //     userId: data.userId,
      //     permCode: p
      //   }));
      //   await permissionService.addPermissions(data.id, perms, data.userId, trx);
      // }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function delete
   * Delete a bucket record. Note this will also delete all objects and permissions
   * related to this specific bucket from the database. Use with caution.
   * @param {string} bucketId The bucket uuid to delete
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  delete: async (bucketId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Bucket.startTransaction();

      const response = await Bucket.query(trx)
        .deleteById(bucketId)
        .throwIfNotFound()
        // Returns array of deleted rows instead of count
        // https://vincit.github.io/objection.js/recipes/returning-tricks.html
        .returning('*');

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function searchBuckets
   * Search and filter for specific bucket records
   * @param {string|string[]} [params.bucketId] Optional string or array of uuids representing the bucket
   * @param {string} [params.bucketName] The optional user-defined bucket name identifier
   * @param {string} [params.key] The optional relative S3 key/subpath
   * @param {boolean} [params.active] The optional active flag
   * @returns {Promise<object[]>} The result of running the find operation
   */
  searchBuckets: (params) => {
    return Bucket.query()
      .allowGraph('bucketPermission')
      .modify('filterBucketIds', params.bucketId)
      .modify('filterBucketName', params.bucketName)
      .modify('filterKey', params.key)
      .modify('filterActive', params.active)
      .modify('filterUserId', params.userId)
      .then(result => result.map(row => {
        // eslint-disable-next-line no-unused-vars
        const { bucketPermission, ...bucket } = row;
        return bucket;
      }));
  },

  /**
   * @function read
   * Get a bucket db record
   * @param {string} bucketId The bucket uuid to read
   * @returns {Promise<object>} The result of running the read operation
   * @throws If there are no records found
   */
  read: (bucketId) => {
    return Bucket.query()
      .findById(bucketId)
      .throwIfNotFound();
  },

  /**
   * @function update
   * Update a bucket DB record
   * @param {string} data.bucketId The bucket uuid
   * @param {string} [data.bucketName] The optional user-defined bucket name identifier
   * @param {string} [data.accessKeyId] The optional S3 bucket access key id
   * @param {string} [data.bucket] The optional S3 bucket identifier
   * @param {string} [data.endpoint] The optional S3 bucket endpoint
   * @param {string} [data.key] The optional relative S3 key/subpath managed by this bucket
   * @param {string} [data.secretAccessKey] The optional S3 bucket secret access key
   * @param {boolean} [data.active] The optional active flag - defaults to true if undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the patch operation
   * @throws The error encountered upon db transaction failure
   */
  update: async (data, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Bucket.startTransaction();

      // Update bucket record in DB
      const response = await Bucket.query(trx).patchAndFetchById(data.bucketId, {
        bucketName: data.bucketName,
        accessKeyId: data.accessKeyId,
        bucket: data.bucket,
        endpoint: data.endpoint,
        key: data.key,
        secretAccessKey: data.secretAccessKey,
        active: data.active,
        updatedBy: data.userId
      });

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },
};

module.exports = service;
