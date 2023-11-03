const { NIL: SYSTEM_USER, v4: uuidv4, validate: uuidValidate } = require('uuid');

const log = require('../components/log')(module.filename);
const utils = require('../db/models/utils');

const { ObjectModel, Version } = require('../db/models');
const { getKeyValue, getUniqueObjects, toLowerKeys } = require('../components/utils');

const metadataService = require('./metadata');
const objectService = require('./object');
const storageService = require('./storage');
const tagService = require('./tag');
const versionService = require('./version');

/**
 * The Sync Service
 * Synchronizes data between S3 object storage and the COMS database
 */
const service = {
  /**
   * @function _deriveObjectId
   * Checks an S3 Object for any previous `coms-id` tag traces and returns it if found.
   * Otherwise it writes a new `coms-id` to the S3 Object if none were previously found.
   * @param {object | boolean} s3Object The result of an S3 HeadObject operation
   * @param {string} path String representing the canonical path for the specified object
   * @param {string | null} bucketId uuid of bucket or `null` if syncing object in default bucket
   * @returns {Promise<string>} Resolves to an existing objectId or creates a new one
   */
  _deriveObjectId: async (s3Object, path, bucketId) => {
    let objId = uuidv4();

    if (typeof s3Object === 'object') { // If regular S3 Object
      const TagSet = await storageService.getObjectTagging({ filePath: path, bucketId: bucketId }).then(result => result.TagSet ?? []);
      const s3ObjectComsId = TagSet.find(obj => (obj.Key === 'coms-id'))?.Value;

      if (s3ObjectComsId && uuidValidate(s3ObjectComsId)) {
        objId = s3ObjectComsId;
      } else { // Update S3 Object if there is still remaining space in the TagSet
        if (TagSet.length < 10) { // putObjectTagging replaces S3 tags so new TagSet must contain existing values
          await storageService.putObjectTagging({
            filePath: path,
            bucketId: bucketId,
            tags: TagSet.concat([{ Key: 'coms-id', Value: objId }])
          });
        }
      }
    } else if (typeof s3Object === 'boolean') { // If soft-deleted S3 Object
      const { Versions } = await storageService.listAllObjectVersions({ filePath: path, bucketId: bucketId });

      for (const versionId of Versions.map(version => version.VersionId)) {
        const TagSet = await storageService.getObjectTagging({
          filePath: path,
          s3VersionId: versionId,
          bucketId: bucketId
        }).then(result => result.TagSet ?? []);
        const oldObjId = TagSet.find(obj => obj.Key === 'coms-id')?.Value;

        if (oldObjId && uuidValidate(oldObjId)) {
          objId = oldObjId;
          break; // Stop iterating if a valid uuid was found
        }
      }
    }

    return Promise.resolve(objId);
  },

  /**
   * @function syncJob
   * Orchestrates the synchronization of all aspects of a specified object
   * Wraps all child processes in one db transaction
   * @param {string} path String representing the canonical path for the specified object
   * @param {string | null} bucketId uuid of bucket or `null` if syncing object in default bucket
   * @param {boolean} [full=false] Optional boolean indicating whether to execute full recursive run
   * @param {string} [userId=SYSTEM_USER] Optional uuid attributing which user added the job
   * @returns {Promise<string | undefined>} Resolves to object uuid or undefined when sync is completed
   * @throws If the synchronization job encountered an error
   */
  syncJob: async (path, bucketId, full = false, userId = SYSTEM_USER) => {
    try {
      if (!path) throw new Error('Path must be defined');

      return await utils.trxWrapper(async (trx) => {
        // 1. Sync Object
        const object = await service.syncObject(path, bucketId, userId, trx)
          .then(obj => obj.object);

        // 2. Sync Object Versions
        let versions = [];
        if (object) {
          versions = await service.syncVersions(object, userId, trx);
        }

        // 3. Sync Version Metadata & Tags
        for (const v of versions) {
          const tasks = [ // Always Update Tags regardless of modification state
            service.syncTags(v.version, path, bucketId, userId, trx)
          ];
          // Only Update Metadata if version has modifications or full mode
          if (v.modified || full) {
            tasks.push(service.syncMetadata(v.version, path, bucketId, userId, trx));
          }

          await Promise.all(tasks);
        }

        return Promise.resolve(object?.id);
      });
    }
    catch (err) {
      log.error(err, { function: 'syncJob' });
      throw err;
    }
  },

  /**
   * @function syncObject
   * Synchronizes Object level data
   * @param {string} path The path of object in sync job
   * @param {string | null} bucketId The uuid bucketId of object in sync job
   * @param {string} [userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} An object containing COMS object if applicable, and modified boolean on whether it was
   * modified or not
   */
  syncObject: async (path, bucketId, userId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      let modified = false;
      let response;

      // Check for COMS and S3 Object statuses
      const [comsObject, s3Object] = await Promise.allSettled([
        // COMS Object
        objectService.searchObjects({ path: path, bucketId: bucketId }, trx),
        // S3 Object
        storageService.headObject({ filePath: path, bucketId: bucketId })
          .catch((e) => { // return boolean true if object is soft-deleted in S3
            return !!e.$response.headers['x-amz-delete-marker'];
          })
      ]).then(settled => settled.map(promise => Array.isArray(promise.value) ? promise.value[0] : promise.value));

      // Case: already synced - record object only
      if (comsObject && s3Object) response = comsObject;

      // Case: not in COMS - insert new COMS object
      else if (!comsObject && s3Object) {
        const objId = await service._deriveObjectId(s3Object, path, bucketId);

        response = await objectService.create({
          id: objId,
          name: path.match(/(?!.*\/)(.*)$/)[0], // get `name` column
          path: path,
          bucketId: bucketId,
          userId: userId
        }, trx);

        modified = true;
      }

      // Case: missing in S3 - drop COMS object
      else if (comsObject && !s3Object) {
        // Delete COMS Object and cascade all child records from COMS
        await objectService.delete(comsObject.id, trx);

        // TODO: Relatively slow operations - determine if this can be optimized
        // Prune metadata and tag records
        await metadataService.pruneOrphanedMetadata(trx);
        await tagService.pruneOrphanedTags(trx);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve({ modified: modified, object: response });
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function syncVersions
   * Synchronizes Version level data
   * @param {object | string} object The parent object or object uuid
   * @param {string} [userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<Array<[object | undefined, boolean]>>} An array of tuples with the COMS versions if applicable,
   * and boolean on whether it was modified or not
   */
  syncVersions: async (object, userId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();

      // Fetch COMS Object record if necessary
      const comsObject = typeof object === 'object' ? object : await objectService.read(object, trx);

      // Check for COMS and S3 Version statuses
      const [comsVersions, s3VersionsRaw] = await Promise.allSettled([
        versionService.list(comsObject.id, trx),
        storageService.listAllObjectVersions({ filePath: comsObject.path, bucketId: comsObject.bucketId })
      ]).then(settled => settled.map(promise => promise.value));

      // Combine S3 DeleteMarkers and Versions into one array
      const s3Versions = s3VersionsRaw.DeleteMarkers
        .map(dm => ({ DeleteMarker: true, ...dm }))
        .concat(s3VersionsRaw.Versions);

      // delete versions from COMS that are not in S3
      // get list of unique coms versions
      const uniqueCVIds = getUniqueObjects(comsVersions, 's3VersionId').map(v => v.id);

      // get COMS versions that are not in S3 (matching on s3VersionId) OR not
      // in list of unique COMS versions (matching on id)
      const cVsToDelete = comsVersions.filter(cv => {
        const notInS3 = !s3Versions.some(s3v => (s3v.VersionId === String(cv.s3VersionId)));
        const isDuplicate = !uniqueCVIds.includes(cv.id);
        return notInS3 || isDuplicate;
      });

      if(cVsToDelete.length){
        await Version.query(trx)
          .delete()
          .where('objectId', comsObject.id)
          .whereNotNull('s3VersionId')
          .whereIn('id', cVsToDelete.map(cv => cv.id));
      }
      // delete versions from comsVersions array for further comparisons
      const comsVersionsToKeep = comsVersions.filter(cv => !cVsToDelete.some(v => cv.id === v.id));

      // Add and Update versions in COMS
      const response = await Promise.all(s3Versions.map(async s3Version => {
        // S3 Object is in non-versioned bucket
        if (s3Version.VersionId === 'null') {
          const mimeType = await storageService.headObject({
            filePath: comsObject.path,
            bucketId: comsObject.bucketId
          }).then(obj => obj.ContentType);

          // Get existing version
          const existingVersion = comsVersions[0];

          // No existing version found
          if (!existingVersion) {
            const newVersion = await versionService.create({
              s3VersionId: null,
              mimeType: mimeType,
              id: comsObject.id,
              etag: s3Version.ETag,
              isLatest: true
            }, userId, trx);
            return { modified: true, version: newVersion };
          }

          // Latest version has different values
          else if (existingVersion.mimeType !== mimeType || existingVersion.etag !== s3Version.ETag) {
            const updatedVersion = await versionService.update({
              mimeType: mimeType,
              id: comsObject.id,
              etag: s3Version.ETag,
              isLatest: true
            }, userId, trx);
            return { modified: true, version: updatedVersion };
          }

          // Version record not modified
          else return { version: existingVersion };
        }
        // S3 Object is in versioned bucket (ie: if VersionId is not 'null')
        else {
          const comsVersion = comsVersionsToKeep.find(cv => cv.s3VersionId === s3Version.VersionId);

          if (comsVersion) { // Version is in COMS
            if (s3Version.IsLatest) { // Patch isLatest flags if changed
              const updated = await versionService.updateIsLatest(comsObject.id, trx);
              return { modified: true, version: updated };
            } else { // Version record not modified
              return { version: comsVersion };
            }
          } else { // Version is not in COMS
            const mimeType = s3Version.DeleteMarker
              ? undefined // Will default to 'application/octet-stream'
              : await storageService.headObject({
                filePath: comsObject.path,
                s3VersionId: s3Version.VersionId,
                bucketId: comsObject.bucketId
              }).then(obj => obj.ContentType);

            const newVersion = await versionService.create({
              s3VersionId: s3Version.VersionId,
              mimeType: mimeType,
              id: comsObject.id,
              deleteMarker: s3Version.DeleteMarker,
              etag: s3Version.ETag,
              isLatest: s3Version.IsLatest
            }, userId, trx);
            // add to response with `newVersion` attribute, required for sync tags/meta logic
            return { modified: true, version: newVersion };
          }
        }
      }));

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function syncTags
   * Synchronizes Tag level data for a specific object version
   * @param {object | string} version The parent version or version uuid
   * @param {string} path String representing the canonical path for the specified object
   * @param {string} [bucketId=undefined] Optional COMS uuid of bucket
   * @param {string} [userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns array of synced versions
   * @returns {Promise<Array<object>>} An array of synced tags that exist in both COMS and S3
   */
  syncTags: async (version, path, bucketId = undefined, userId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();
      let response = [];

      // Fetch COMS version record if necessary
      const comsVersion = typeof version === 'object' ? version : await versionService.get({ versionId: version }, trx);

      // Short circuit if version is a delete marker
      if (comsVersion.deleteMarker) return response;

      // Check for COMS and S3 Tag statuses
      const [comsTagsForVersion, s3TagsForVersion] = await Promise.allSettled([
        tagService.fetchTagsForVersion({ versionIds: comsVersion.id }, trx),
        storageService.getObjectTagging({ filePath: path, s3VersionId: comsVersion.s3VersionId, bucketId: bucketId })
      ]).then(settled => settled.map(promise => promise.value));

      // COMS Tags
      const comsTags = comsTagsForVersion[0]?.tagset ?? [];
      // S3 Tags
      const s3Tags = toLowerKeys(s3TagsForVersion?.TagSet ?? []);
      /**
       * Add coms-id tag to latest version in S3 if not already present
       * NOTE: For a sync job the _deriveObjectId() function will have already added
       * the coms-id to latest version.
       * TODO: check if this version is still also the latest on corresponding version in S3
       */
      if (comsVersion.isLatest && s3Tags.length < 10 && !s3Tags.find(s3T => s3T.key === 'coms-id')) {
        /**
         * NOTE: adding tags to a specified version (passing a `VersionId` parameter) will affect `Last Modified`
         * attribute of multiple versions on some s3 storage providors including Dell ECS
         */
        await storageService.putObjectTagging({
          filePath: path,
          tags: (s3TagsForVersion?.TagSet ?? []).concat([{
            Key: 'coms-id',
            Value: comsVersion.objectId
          }]),
          bucketId: bucketId,
          // s3VersionId: comsVersion.s3VersionId,
        });
        // add to our arrays for comaprison
        s3Tags.push({ key: 'coms-id', value: comsVersion.objectId });
      }

      // Dissociate Tags not in S3
      const oldTags = [];
      for (const comsT of comsTags) {
        if (!s3Tags.some(s3T => s3T.key === comsT.key && s3T.value === comsT.value)) {
          oldTags.push(comsT);
        }
      }
      if (oldTags.length > 0) {
        await tagService.dissociateTags(comsVersion.id, oldTags, trx);
      }

      // Associate new S3 Tags
      const newTags = [];
      for (const s3Tag of s3Tags) {
        if (!comsTags.some(comsT => comsT.key === s3Tag.key && comsT.value === s3Tag.value)) {
          newTags.push(s3Tag);
        } else {
          response.push(s3Tag);
        }
      }
      if (newTags.length > 0) {
        await tagService.associateTags(comsVersion.id, newTags, userId, trx);
        response.push(...newTags);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function syncMetadata
   * Synchronizes Metadata level data for a specific object version
   * @param {object | string} version The parent version or version uuid
   * @param {string} path String representing the canonical path for the specified object
   * @param {string} [bucketId=undefined] Optional COMS uuid of bucket
   * @param {string} [userId=SYSTEM_USER] The uuid of a user that created the sync job
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * returns array of synced versions
   * @returns {Promise<Array<object>>} An array of synced metadata that exist in both COMS and S3
   */
  syncMetadata: async (version, path, bucketId = undefined, userId = SYSTEM_USER, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Version.startTransaction();
      let response = [];

      // Fetch COMS Object record if necessary
      const comsVersion = typeof version === 'object' ? version : await versionService.get({ versionId: version }, trx);

      // Short circuit if version is a delete marker
      if (comsVersion.deleteMarker) return response;

      // Check for COMS and S3 Metadata statuses
      const [comsMetadataForVersion, s3ObjectHead] = await Promise.allSettled([
        metadataService.fetchMetadataForVersion({ versionIds: comsVersion.id }, trx),
        storageService.headObject({ filePath: path, s3VersionId: comsVersion.s3VersionId, bucketId: bucketId })
      ]).then(settled => settled.map(promise => promise.value));

      // COMS Metadata
      const comsMetadata = comsMetadataForVersion[0]?.metadata ?? [];
      // S3 Metadata
      const s3Metadata = getKeyValue(s3ObjectHead?.Metadata ?? {});

      // Dissociate Metadata not in S3
      const oldMetadata = [];
      for (const comsM of comsMetadata) {
        if (!s3Metadata.some(s3M => s3M.key === comsM.key && s3M.value === comsM.value)) {
          oldMetadata.push(comsM);
        }
      }
      if (oldMetadata.length > 0) {
        await metadataService.dissociateMetadata(version.id, oldMetadata, trx);
      }

      // Associate new S3 Metadata
      const newMetadata = [];
      for (const s3M of s3Metadata) {
        if (!comsMetadata.some(comsM => comsM.key === s3M.key && comsM.value === s3M.value)) {
          newMetadata.push(s3M);
        } else {
          response.push(s3M);
        }
      }
      if (newMetadata.length > 0) {
        await metadataService.associateMetadata(version.id, newMetadata, userId, trx);
        response.push(...newMetadata);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  }
};

module.exports = service;
