const { v4: uuidv4 } = require('uuid');

const { Permissions } = require('../components/constants');
const { ObjectModel, ObjectPermission } = require('../db/models');

const service = {
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

  /** For an object and user get the permissions they have */
  readPermissions: (objId, oidcId) => {
    return ObjectPermission.query()
      .where('objectId', objId)
      .where('oidcId', oidcId);
  }
};

module.exports = service;
