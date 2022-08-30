const { NIL: SYSTEM_USER } = require('uuid');
const { Tag, VersionTag } = require('../db/models');

/**
 * The Tag DB Service
 */
const service = {

  /**
   * @function addTags
   * add tags (if required) and relates them to the version
   * NOTE: this function is not curtrently used.
   * Because all our controllers do a 'replace all' tags process that calls the updateTags() method below
   * @param {string} versionId The uuid id column from version table
   * @param {object} tags Incoming object with `<key>:<value>` tags to add for this version
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
      if (tags.length) {
        // step 1: add any new records to tag table and return id's of tags provided
        const tIds = await service.addTagRecords(tags, trx);
        // relate new Tags
        response = await service.relateTags(versionId, tIds, currentUserId, trx);
      }
      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }

  },

  /**
   * @function updateTags
   * Updates tags and relates them to the associated version
   * Un-relates any existing tags for this version
   * @param {string} versionId The uuid id column from version table
   * @param {object} tags Incoming object with `<key>:<value>` tags to add for this version
   * @param {string} [currentUserId=SYSTEM_USER] The optional userId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  updateTags: async (versionId, tags, currentUserId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Tag.startTransaction();
      let response = [];
      if (tags.length) {

        // step 1: add any new records to tag table and return id's of tags provided
        const tIds = await service.addTagRecords(tags, trx);

        // step 2: relate all provided tags to this version
        // get all existing related tags for this versionId
        const allTags = await VersionTag.query(trx)
          .select('tagId')
          .where('versionId', versionId);
        const allTagIds = allTags.map(el => el.tagId);

        let newTagIds = [];
        tIds.filter(tId => {
          // if join is not already in db
          if (!allTagIds.some( aTagId => (aTagId === tId))) {
            newTagIds.push(tId);
          }
        });

        // relate new Tags
        response = await service.relateTags(versionId, newTagIds, currentUserId, trx);

        // unrelate tags that WERE related but no longer are
        const unrelateTags = allTagIds.filter(tagId => !tIds.includes(tagId));
        unrelateTags.length ? await service.unRelateTags(versionId, unrelateTags, trx) : [];
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function relateTags
   * relates all provided tags to the versionId
   * @param {*} versionId The uuid id column from version table
   * @param {string[]} tagIds array of tag id's
   * @param {*} currentUserId uuid of current user
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  relateTags: async (versionId, tagIds, currentUserId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Tag.startTransaction();
      let response = [];

      // relate all incoming tags
      const relateArray = tagIds.map((id => ({
        versionId: versionId,
        tagId: id,
        createdBy: currentUserId
      })));
      response = await VersionTag.query(trx)
        .insert(relateArray);

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function unRelateTags
   * un-relates all provided tags from a versionId
   * @param {*} versionId The uuid id column from version table
   * @param {string[]} tagIds array of tag id's
   * @param {*} currentUserId uuid of current user
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<number>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  unRelateTags: async (versionId, tagIds, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Tag.startTransaction();
      let response = [];

      // delete joining records
      response = await VersionTag.query(trx)
        .delete()
        .whereIn('tagId', tagIds)
        .andWhere('versionId', versionId);

      // delete any orphaned tags from the provided set
      await service.deleteOrphanedTags(trx);

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function deleteOrphanedTags
   * deletes Tag records if they are no longer related to any versions
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<number>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  deleteOrphanedTags: async (etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Tag.startTransaction();
      let response = [];

      // TODO: this query is currently not doing anything.

      response = await Tag.query(trx)
      // response = Tag.query(trx)
        .leftJoin('version_tag', 'tag.id', 'version_tag.tagId')
        .whereNull('version_tag.versionId')
        .delete();
      //   .delete().toKnexQuery();
      // console.log(response.toQuery());
      // sql: delete from "tag" using "version_tag" where "version_tag"."versionId" is null and "tag"."id" = "version_tag"."tagId"

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function addTagRecords
   * Inserts any tag records if they dont already exist in db
   * @param {object} tags Incoming object with `<key>:<value>` tags to add for this version
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} an array of the tag id's of all provided tags
   * @throws The error encountered upon db transaction failure
   */
  addTagRecords: async (tags, etrx = undefined) => {
    let trx;
    let response;
    try {
      trx = etrx ? etrx : await Tag.startTransaction();

      // get all tags already in db
      const allTags = await Tag.query(trx).select();

      let existingTags = [];
      let newTags = [];
      tags.filter(({ key, value }) => {
        // if tag is already in db add tag id to existingTags array
        if (allTags.some(({ key: allKey, value: allValue }) => (allKey === key && allValue === value))) {
          existingTags.push(allTags.find(el => el.key === key).id);
        } else {
          // else add tag id to newTags array
          newTags.push({ key: key, value: value });
        }
      });

      // insert new tags
      if (newTags.length) {
        const newTagArr = await Tag.query(trx)
          .insert(newTags);
        // merge newTag id's with existing tag id's
        response = existingTags.concat(newTagArr.map(t => t.id));
      } else {
        response = existingTags;
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
