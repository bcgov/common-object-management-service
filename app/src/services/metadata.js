const { NIL: SYSTEM_USER } = require('uuid');
const { Metadata, VersionMetadata } = require('../db/models');
const { getKeyValue } = require('../components/utils');

/**
 * The Metadata DB Service
 */
const service = {

  /**
   * @function addMetadata
   * Add given Metadata and relate to a given version in database
   * Un-relates any existing metadata for this version
   * @param {string} versionId The uuid id column from version table
   * @param {object} metadata Incoming object with `<key>:<value>` metadata to add for this version
   * @param {string} [currentUserId=SYSTEM_USER] The optional userId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  addMetadata: async (versionId, metadata, currentUserId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Metadata.startTransaction();
      let response = [];

      // convert metadata to array for DB insert query
      const arr = getKeyValue(metadata);
      if (arr.length) {
        // insert/merge metadata records
        const insertMetadata = await Metadata.query(trx)
          .insert(arr)
          .onConflict(['key', 'value'])
          .merge();// required to include id's of existing rows in result

        // un-relate all existing version_metadata (when updating a version)
        await VersionMetadata.query(trx)
          .delete()
          .where('versionId', versionId);

        // add new version_metadata records
        const relateArray = insertMetadata.map(({id}) => ({
          versionId: versionId,
          metadataId: id,
          createdBy: currentUserId
        }));
        response = await VersionMetadata.query(trx)
          .insert(relateArray);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

};

module.exports = service;
