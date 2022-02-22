const { v4: uuidv4 } = require('uuid');

const { Permissions } = require('../components/constants');
const { ObjectModel, ObjectPermission } = require('../db/models');

const service = {
  /** Create an object DB record and give the uploader (if authed) permissions */
  create: async (data, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // Add file record to DB
      const obj = {
        id: data.id,
        originalName: data.originalName,
        path: data.path,
        mimeType: data.mimeType,
        public: data.public,
        createdBy: data.oidcId
      };
      await ObjectModel.query(trx).insert(obj);

      // Add all permissions for the uploader
      if (data.oidcId) {
        const perms = Object.keys(Permissions)
          .map((p) => ({
            id: uuidv4(),
            oidcId: data.oidcId,
            objectId: obj.id,
            createdBy: data.oidcId,
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
  delete: async (objId, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectPermission.startTransaction();

      await ObjectPermission.query(trx)
        .delete()
        .where('objectId', objId);

      await ObjectModel.query(trx)
        .deleteById(objId)
        .throwIfNotFound();

      if (!etrx) await trx.commit();
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /** For the given user, get the permissions they have */
  fetchAllForUser: (oidcId) => {
    // TODO: Consider using ObjectPermission as top level instead for efficiency?
    return ObjectModel.query()
      .allowGraph('[objectPermission]')
      .withGraphFetched('objectPermission')
      .modifyGraph('objectPermission', builder => builder.where('oidcId', oidcId))
      // TODO: Convert this filter to compute on DB query
      .then(response => response.filter(r => r.objectPermission && r.objectPermission.length));
  },

  /** Share a file permission with a user */
  // TODO: Refactor
  share: async (objId, oidcId, permissions, currentUser, etrx = undefined) => {
    if (!oidcId || !objId || !Array.isArray(permissions)) {
      throw new Error('invalid parameters supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await ObjectPermission.startTransaction();

      const permRecs = permissions
        .map((p) => ({
          id: uuidv4(),
          oidcId: oidcId,
          objectId: objId,
          createdBy: currentUser.keycloakId,
          code: Permissions[p]
        }));
      await ObjectPermission.query(trx).insert(permRecs);

      if (!etrx) await trx.commit();
      const result = await service.readPermissions(objId, oidcId);
      return result;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /** Get an object db record */
  read: (objId) => {
    return ObjectModel.query()
      .findById(objId)
      .throwIfNotFound();
  },

  /** For an object and user get the permissions they have */
  readPermissions: (objId, oidcId) => {
    return ObjectPermission.query()
      .where('objectId', objId)
      .where('oidcId', oidcId);
  },

  /** Update an object DB record */
  update: async (data, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await ObjectModel.startTransaction();

      // Add file record to DB
      const response = await ObjectModel.query(trx).patchAndFetchById(data.id, {
        originalName: data.originalName,
        path: data.path,
        mimeType: data.mimeType,
        public: data.public,
        updatedBy: data.oidcId
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
