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

  /** Get an object db record */
  // TODO: Add modify logic to ObjectModel
  listObjects: () => {
    return ObjectModel.query();
  },

  /** Get an object db record */
  read: (objId) => {
    return ObjectModel.query()
      .findById(objId)
      .throwIfNotFound();
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
