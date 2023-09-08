const { NIL: SYSTEM_USER } = require('uuid');
const { ObjectModel, Metadata, VersionMetadata, Version } = require('../db/models');
const { getObjectsByKeyValue } = require('../components/utils');

/**
 * The Metadata DB Service
 */
const service = {
  /**
   * @function associateMetadata
   * Makes the incoming list of metadata the definitive set associated with versionId
   * Dissociaate extraneous metadata and also does collision detection for null versions (non-versioned)
   * @param {string} versionId The uuid id column from version table
   * @param {object[]} metadata Incoming array of metadata objects to add for this version (eg: [{ key: 'a', value: '1'}, {key: 'B', value: '2'}]).
   * This will always be the definitive metadata we want on the version
   * @param {string} [currentUserId=SYSTEM_USER] The optional userId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  associateMetadata: async (versionId, metadata, currentUserId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Metadata.startTransaction();
      let response = [];

      if (metadata && metadata.length) {
        // get DB records of all input metadata
        const dbMetadata = await service.createMetadata(metadata, trx);

        // for non-versioned objects we are updating metadata joins for an existing version
        const associatedMetadata = await VersionMetadata.query(trx)
          .modify('filterVersionId', versionId);
        // remove existing joins for metadata that is not in incomming set
        if (associatedMetadata.length) {
          const dissociateMetadata = associatedMetadata.filter(({ metadataId }) => !dbMetadata.some(({ id }) => id === metadataId));
          if (dissociateMetadata.length) {
            await VersionMetadata.query(trx)
              .whereIn('metadataId', dissociateMetadata.map(vm => vm.metadataId))
              .modify('filterVersionId', versionId)
              .delete();
          }
        }

        // join new metadata
        const newJoins = associatedMetadata.length ? dbMetadata.filter(({ id }) => !associatedMetadata.some(({ metadataId }) => metadataId === id)) : dbMetadata;

        if (newJoins.length) {
          response = await VersionMetadata.query(trx)
            .insert(newJoins.map(({ id }) => ({
              versionId: versionId,
              metadataId: id,
              createdBy: currentUserId
            })));
        }

        // delete all orphaned metadata records
        await service.pruneOrphanedMetadata(trx);
        // TODO: call a dissociateMetadata() function for this version
        // and prune old metadata from there.

      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function createMetadata
   * Inserts any metadata records if they dont already exist in db
   * @param {object} metadata Incoming object with `<key>:<value>` metadata to add for this version
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} an array of all input metadata
   * @throws The error encountered upon db transaction failure
   */
  createMetadata: async (metadata, etrx = undefined) => {
    let trx;
    let response = [];
    try {
      trx = etrx ? etrx : await Metadata.startTransaction();

      // get all metadata already in db
      const allMetadata = await Metadata.query(trx).select();
      const existingMetadata = [];
      const newMetadata = [];

      metadata.forEach(({ key, value }) => {
        // if metadata is already in db
        if (getObjectsByKeyValue(allMetadata, key, value)) {
          // add metadata object to existingMetadata array
          existingMetadata.push({ id: getObjectsByKeyValue(allMetadata, key, value).id, key: key, value: value });
        }
        // else add to array for inserting
        else {
          newMetadata.push({ key: key, value: value });
        }
      });
      // insert new metadata
      if (newMetadata.length) {
        const newMetadataRecords = await Metadata.query(trx)
          .insert(newMetadata)
          .returning('*');
        // merge new with existing metadata
        response = existingMetadata.concat(newMetadataRecords);
      }
      else {
        response = existingMetadata;
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },


  /**
   * @function dissociateMetadata
   * Dissociates all provided metadata from a version
   * @param {string} versionId The uuid id column from version table
   * @param {object[]} [metadata=undefined] array of metadata (eg: [{ key: 'a', value: '1'}, {key: 'B', value: ''}])
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<number>} The result of running the delete operation (number of rows deleted)
   * @throws The error encountered upon db transaction failure
   */
  dissociateMetadata: async (versionId, metadata = undefined, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Metadata.startTransaction();
      let response = 0;

      // TODO: consider doing one bulk delete query instead of using forEach
      // eg: get id's of provided metadata records and do whereIn().delete()
      metadata.forEach(async meta => {
        // match on key
        const params = { 'metadata.key': meta.key };
        // if metadata has a value match key and value
        if (meta.value && meta.value !== '') params['metadata.value'] = meta.value;

        let count = 0;
        count = await VersionMetadata.query(trx)
          .allowGraph('metadata')
          .withGraphJoined('metadata')
          .where(params)
          .modify('filterVersionId', versionId)
          .delete();

        if (count) response += count;
      });

      // delete all orphaned metadata
      await service.pruneOrphanedMetadata(trx);

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function fetchMetadataForObject
   * Fetch metadata for specific objects, optionally scoped to a user's object/bucket READ permission
   * @param {string[]} [params.bucketIds] An array of uuids representing buckets
   * @param {string[]} params.objId An array of uuids representing the object
   * @param {object} [params.metadata] Optional object of metadata key/value pairs
   * @param {string} [params.userId] Optional uuid representing a user
   * @returns {Promise<object[]>} The result of running the find operation
   */
  fetchMetadataForObject: (params) => {
    return ObjectModel.query()
      .select('object.id AS objectId', 'object.bucketId as bucketId')
      .allowGraph('version.metadata')
      .withGraphJoined('version.metadata')
      // get latest version that isn't a delete marker by default
      .modifyGraph('version', builder => {
        builder
          .select('version.id', 'version.objectId')
          .orderBy([
            'version.objectId',
            { column: 'version.createdAt', order: 'desc' }
          ])
          .where('deleteMarker', false)
          .distinctOn('version.objectId');
      })
      // match on metadata parameter
      .modifyGraph('version.metadata', builder => {
        builder
          .select('key', 'value')
          .modify('filterKeyValue', { metadata: params.metadata });
      })
      // match on objId parameter
      .modify('filterIds', params.objId)
      // match on bucketIds parameter
      .modify('filterBucketIds', params.bucketIds)
      // scope to objects that user(s) has READ permission at object or bucket-level
      .modify('hasPermission', params.userId, 'READ')
      // re-structure result like: [{ objectId: abc, metadata: [{ key: a, value: b }] }]
      .then(result => result.map(row => {
        return {
          objectId: row.objectId,
          metadata: row.version[0].metadata
        };
      }));
  },

  /**
  * @function fetchMetadataForVersion
  * Fetch metadata for specific versions, optionally scoped to a user's object/bucket READ permission
  * @param {string[]} [params.versionIds] An array of uuids representing versions
  * @param {object} [params.metadata] Optional object of metadata key/value pairs
  * @param {string} [params.userId] Optional uuid representing a user
  * @param {object} [etrx=undefined] An optional Objection Transaction object
  * @returns {Promise<object[]>} The result of running the database select
  */
  fetchMetadataForVersion: async (params, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Metadata.startTransaction();

      const response = await Version.query(trx)
        .select('version.id as versionId', 'version.s3VersionId')
        .allowGraph('metadata')
        .withGraphJoined('metadata')
        .modifyGraph('metadata', builder => {
          builder
            .select('key', 'value')
            .modify('filterKeyValue', { metadata: params.metadata });
        })
        .modify((query) => {
          if (params.s3VersionIds) query.modify('filterS3VersionId', params.s3VersionIds);
          else query.modify('filterId', params.versionIds);
        })
        .modify('filterId', params.versionIds)
        // filter by objects that user(s) has READ permission at object or bucket-level
        .modify((query) => {
          if (params.userId) {
            query
              .allowGraph('object')
              .withGraphJoined('object')
              .modifyGraph('object', query => { query.modify('hasPermission', params.userId, 'READ'); })
              .whereNotNull('object.id');
          }
        })
        // format result
        .orderBy('version.createdAt', 'desc')
        .then(result => result.map(row => {
          // eslint-disable-next-line no-unused-vars
          const { object, ...data } = row;
          return data;
        }));

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function pruneOrphanedMetadata
   * deletes Metadata records if they are no longer related to any versions
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<number>} The result of running the delete operation (number of rows deleted)
   * @throws The error encountered upon db transaction failure
   */
  pruneOrphanedMetadata: async (etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Metadata.startTransaction();

      const deletedMetadataIds = await Metadata.query(trx)
        .allowGraph('versionMetadata')
        .withGraphJoined('versionMetadata')
        .select('metadata.id')
        .whereNull('versionMetadata.metadataId');

      const response = await Metadata.query(trx)
        .delete()
        .whereIn('id', deletedMetadataIds.map(({ id }) => id));

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function searchMetadata
   * Search and filter for specific metadata keys
   * @param {object} [params.metadata] Optional object of metadata keys to filter on
   * @param {string} [params.userId] Optional uuid representing a user
   * @returns {Promise<object[]>} The result of running the find operation
   */
  searchMetadata: (params) => {
    return Metadata.query()
      .modify((query) => {
        if (params.privacyMask) {
          query
            .select('key')
            .modify('filterKey', { metadata: params.metadata });
        }
        else {
          query
            .select('key', 'value')
            .modify('filterKeyValue', { metadata: params.metadata });
        }
      });
  },
};

module.exports = service;
