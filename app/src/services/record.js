const { v4: uuidv4 } = require('uuid');

const { Permissions } = require('../components/constants');
const { ObjectModel, ObjectPermission } = require('../db/models');

const service = {
  /** Create an object DB record and give the uploader (if authed) permissions */
  create: async (objectStorageData, body, currentUser, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

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

      if (!etrx) await trx.commit();
      const result = await service.read(obj.id);
      return result;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },


  /** Delete an object record */
  delete: async (id, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      await ObjectModel.query(trx)
        .deleteById(id)
        .throwIfNotFound();

      if (!etrx) await trx.commit();
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /** For the given user, get the permissions they have */
  fetchAllForUser: (currentUser) => {
    return ObjectModel.query()
      .allowGraph('[objectPermission]')
      .withGraphFetched('objectPermission')
      .modifyGraph('objectPermission', builder => builder.where('oidcId', currentUser.keycloakId));
  },


  /** Share a file permission with a user */
  share: async (objectId, oidcId, permissions, currentUser, etrx = undefined) => {
    if (!oidcId || !objectId || !Array.isArray(permissions)) {
      throw new Error('invalid parameters supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await ObjectPermission.startTransaction();

      const permRecs = permissions
        .map((p) => ({
          id: uuidv4(),
          oidcId: oidcId,
          objectId: objectId,
          createdBy: currentUser.keycloakId,
          code: Permissions[p]
        }));
      await ObjectPermission.query(trx).insert(permRecs);


      if (!etrx) await trx.commit();
      const result = await service.readPermissions(objectId, oidcId);
      return result;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /** Get an object db record */
  read: (id) => {
    return ObjectModel.query()
      .findById(id)
      .throwIfNotFound();
  },

  /** For an object and user get the permissions they have */
  readPermissions: (objectId, oidcId) => {
    return ObjectPermission.query()
      .where('objectId', objectId)
      .where('oidcId', oidcId);
  },
};

module.exports = service;
