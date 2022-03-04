const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

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

  /**
   * @function addPermissions
   * Grants object permissions to users
   * @param {string} objId The objectId uuid
   * @param {object[]} data Incoming array of `oidcId` and `code` permission tuples to add for this `objId`
   * @param {string} [currentOidcId=SYSTEM_USER] The optional oidcId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  addPermissions: async (objId, data, currentOidcId = SYSTEM_USER, etrx = undefined) => {
    if (!Array.isArray(data) && !data.length || !objId) {
      throw new Error('invalid parameters supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await ObjectPermission.startTransaction();

      // Get existing permissions for the current object
      const currentPerms = await service.searchPermissions({ objId });
      const obj = data
        // Ensure all codes are upper cased
        .map(p => ({ ...p, code: p.code.toUpperCase() }))
        // Filter out any invalid code values
        .filter(p => Permissions.some(perm => perm === p.code))
        // Filter entry tuples that already exist
        .filter(p => !currentPerms.some(cp => cp.oidcId === p.oidcId && cp.code === p.code))
        // Create DB objects to insert
        .map(p => ({
          id: uuidv4(),
          oidcId: p.oidcId,
          objectId: objId,
          code: p.code,
          createdBy: currentOidcId,
        }));

      // Insert missing entries
      let response = [];
      if (obj.length) {
        response = await ObjectPermission.query(trx).insertAndFetch(obj);
      }

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function searchPermissions
   * Search and filter for specific object permissions
   * @param {object} [params.oidcId] Optional string uuid representing the user
   * @param {object} [params.objId] Optional string uuid representing the object
   * @param {object} [params.code] Optional array containing a set of code strings
   * @returns {Promise<object>} The result of running the find operation
   */
  searchPermissions: (params) => {
    return ObjectPermission.query()
      .modify('filterOidcId', params.oidcId)
      .modify('filterObjectId', params.objId)
      .modify('filterCodes', params.codes);
  }
};

module.exports = service;
