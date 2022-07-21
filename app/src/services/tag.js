const { NIL: SYSTEM_USER } = require('uuid');
const { Tag, VersionTag } = require('../db/models');

/**
 * The Tag DB Service
 */
const service = {

  /**
   * @function addTags
   * Add given Tags and relate to a given version in database
   * Un-relates any existing tags for this version
   * @param {string} versionId The uuid id column from version table
   * @param {object} metadata Incoming object with `<key>:<value>` metadata to add for this version
   * @param {string} [currentUserId=SYSTEM_USER] The optional userId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  addTags: async (versionId, tags, currentUserId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Tag.startTransaction();
      let response = [];

      // insert/merge tag records
      const insertTags = await Tag.query(trx)
        .insert(tags)
        .onConflict(['key', 'value'])
        .merge(); // required to include id's of existing rows in result


      // un-relate all existing tags (when adding additional tags to a version)
      await VersionTag.query(trx)
        .delete()
        .where('versionId', versionId);

      // relate all incomming tags
      if (tags.length) {
        const relateArray = insertTags.map(({ id }) => ({
          versionId: versionId,
          tagId: id,
          createdBy: currentUserId
        }));
        response = await VersionTag.query(trx)
          .insert(relateArray);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function replaceTags
   * Replace all Tags with given Tags and relate to a given version in database
   * @param {string} versionId The uuid id column from version table
   * @param {object} tags Incoming object with `<key>:<value>` tsg to add for this version
   * @param {string} [currentUserId=SYSTEM_USER] The optional userId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  // replaceTags: async (versionId, tags, currentUserId = SYSTEM_USER, etrx = undefined) => {
  //   let trx;
  //   try {
  //     trx = etrx ? etrx : await Tag.startTransaction();
  //     let response = [];

  //     // convert tags to array for DB insert query
  //     const arr = getKeyValue(tags);
  //     if (arr.length) {
  //       // insert/merge tag records
  //       const insertTags = await Tag.query(trx)
  //         .insert(arr)
  //         .onConflict(['key', 'value'])
  //         .merge(); // required to include id's of existing rows in result

  //       // un-relate all existing version_tag (when updating a version)
  //       await VersionTag.query(trx)
  //         .delete()
  //         .where('versionId', versionId);

  //       // add new version_tag records
  //       const relateArray = insertTags.map(({ id }) => ({
  //         versionId: versionId,
  //         tagId: id,
  //         createdBy: currentUserId
  //       }));
  //       response = await VersionTag.query(trx)
  //         .insert(relateArray);
  //     }

  //     if (!etrx) await trx.commit();
  //     return Promise.resolve(response);
  //   } catch (err) {
  //     if (!etrx && trx) await trx.rollback();
  //     throw err;
  //   }
  // },

};

module.exports = service;
