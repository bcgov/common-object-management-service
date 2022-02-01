const { v4: uuidv4 } = require('uuid');

const { Permissions } = require('../constants');
const { ObjectModel, ObjectPermission } = require('../../db/models');

const service = {
  create: async (needAResultFromObjectStorageLayer, body, currentUser) => {
    currentUser = {
      keycloakId: '00000000-0000-0000-0000-000000000000',
      userName: 'test'
    };
    let trx;
    try {
      trx = await ObjectModel.startTransaction();

      const obj = {};
      obj.id = uuidv4();
      // obj.originalName = needAResultFromObjectStorageLayer.originalname;
      // obj.mimeType = needAResultFromObjectStorageLayer.mimetype;
      obj.originalName = 'temp';
      obj.mimeType = 'temp1';
      // obj.createdBy = currentUser.username;
      obj.createdBy = '00000000-0000-0000-0000-000000000000';
      obj.public = body.public === 'true'; // sort this out, string or boolean
      // obj.path = needAResultFromObjectStorageLayer.path;
      obj.path = 'temp2';
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

  read: async (id) => {
    return ObjectModel.query()
      .findById(id)
      .throwIfNotFound();
  },
};

module.exports = service;
