const { v4: uuidv4 } = require('uuid');

const { Permissions } = require('../components/constants');
const { ObjectModel, ObjectPermission } = require('../db/models');

const service = {
  /** Create an object DB record and give the uploader (if authed) permissions */
  create: async (data, path, public=false, oidcId=undefined, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      const obj = {
        id: data.id,
        originalName: data.originalName,
        path: path,
        mimeType: data.mimeType,
        public: public
      };
      // if (oidcId) obj.createdBy = oidcId;

      // Add file record to DB
      await ObjectModel.query(trx).insert(obj);

      // Add all permissions for the uploader
      if (oidcId) {
        const perms = Object.keys(Permissions)
          .map((p) => ({
            id: uuidv4(),
            oidcId: oidcId,
            objectId: obj.id,
            createdBy: oidcId,
            code: Permissions[p]
          }));
        await ObjectPermission.query(trx).insert(perms);
      }

      if (!etrx) await trx.commit();
      return await service.read(obj.id);
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
