const { v4: uuidv4 } = require('uuid');

const { Permissions } = require('../constants');
const { ObjectModel, ObjectPermission } = require('../../db/models');

const service = {

  // Create an object DB record and give the uploader (if authed) permissions
  create: async (objectStorageData, body, currentUser) => {
    let trx;
    try {
      trx = await ObjectModel.startTransaction();

      const obj = {};
      obj.id = uuidv4();
      obj.originalName = objectStorageData.originalName;
      obj.mimeType = objectStorageData.mimeType;
      if (currentUser.keycloakId) {
        obj.createdBy = currentUser.username;
      }
      obj.public = body.public === 'true';
      obj.path = objectStorageData.path;
      if (currentUser.keycloakId) {
        obj.uploaderOidcId = currentUser.keycloakId;
      }

      // Add file record to DB
      await ObjectModel.query(trx).insert(obj);

      // Add all permissions for the uploader
      if (currentUser.keycloakId) {
        const pArr = Object.keys(Permissions)
          .map((p) => ({
            id: uuidv4(),
            oidcId: currentUser.keycloakId,
            objectId: obj.id,
            createdBy: currentUser.keycloakId,
            code: Permissions[p]
          }));
        await ObjectPermission.query(trx).insert(pArr);
      }

      await trx.commit();
      const result = await service.read(obj.id);
      return result;
    } catch (err) {
      if (trx) await trx.rollback();
      throw err;
    }
  },

  // Delete an object record
  delete: async (id) => {
    let trx;
    try {
      trx = await ObjectModel.startTransaction();

      await ObjectModel.query(trx)
        .deleteById(id)
        .throwIfNotFound();

      await trx.commit();
    } catch (err) {
      if (trx) await trx.rollback();
      throw err;
    }
  },

  // For the given user, get the permissions they have
  fetchAllForUser: async (currentUser) => {
    return ObjectModel.query()
      .allowGraph('[objectPermission]')
      .withGraphFetched('objectPermission')
      .modifyGraph('objectPermission', builder => builder.where('oidcId', currentUser.keycloakId));
  },

  // Share a file permission with a user
  share: async (objectId, oidcId, permissions, currentUser) => {
    if (!oidcId || !objectId || !Array.isArray(permissions)) {
      throw new Error('invalid parameters supplied');
    }
    let trx;
    try {
      trx = await ObjectPermission.startTransaction();

      const permRecs = permissions
        .map((p) => ({
          id: uuidv4(),
          oidcId: oidcId,
          objectId: objectId,
          createdBy: currentUser.keycloakId,
          code: Permissions[p]
        }));
      await ObjectPermission.query(trx).insert(permRecs);


      await trx.commit();
      const result = await service.readPermissions(objectId, oidcId);
      return result;
    } catch (err) {
      if (trx) await trx.rollback();
      throw err;
    }
  },

  // Get an object db record
  read: async (id) => {
    return ObjectModel.query()
      .findById(id)
      .throwIfNotFound();
  },

  // For an object and user get the permissions they have
  readPermissions: async (objectId, oidcId) => {
    return ObjectPermission.query()
      .where('objectId', objectId)
      .where('oidcId', oidcId);
  },
};

module.exports = service;
