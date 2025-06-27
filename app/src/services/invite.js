const { NIL: SYSTEM_USER } = require('uuid');

const { Invite } = require('../db/models');

/**
 * The Invite DB Service
 */
const service = {
  /**
   * @function create
   * Creates an invitation token record
   * @param {string} data.token The invitation token uuid
   * @param {string} [data.email] The optional email address of the intended recipient
   * @param {string} data.resource The uuid of the target resource
   * @param {(bucketId|objectId)} data.type The type of resource. Must either be `bucketId` or `objectId`.
   * @param {string} [data.permCode] Permission level for the invite.
   * @param {string} [data.expiresAt] The optional time this token will expire at.
   * Defaults to 24 hours from now if unspecified.
   * @param {string} [data.userId] The optional userId that requested this generation
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  async create(data, etrx = undefined) {
    let trx;
    try {
      trx = etrx ? etrx : await Invite.startTransaction();
      const response = await Invite.query(trx).insert({
        token: data.token,
        email: data.email,
        resource: data.resource,
        type: data.type,
        // if permCodes provided set as unique permCodes otherwise just ['READ']
        permCodes: data.permCodes ? Array.from(new Set(data.permCodes)) : ['READ'],
        expiresAt: data.expiresAt,
        createdBy: data.userId ?? SYSTEM_USER,
        recursive: data.recursive ?? false
      });

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function delete
   * Deletes an invitation token record
   * @param {string} token The invitation token uuid
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  delete: async (token, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Invite.startTransaction();

      const response = await Invite.query(trx)
        .deleteById(token)
        .throwIfNotFound()
        // Returns array of deleted rows instead of count
        // https://vincit.github.io/objection.js/recipes/returning-tricks.html
        .returning('*');

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function prune
   * Deletes all expired invitation token records
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  prune: async (etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Invite.startTransaction();

      const response = await Invite.query(trx)
        .delete()
        .where('expiresAt', '<', new Date().toISOString())
        // Returns array of deleted rows instead of count
        // https://vincit.github.io/objection.js/recipes/returning-tricks.html
        .returning('*');

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function read
   * Gets an invitation token record
   * @param {string} token The invitation token uuid
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the read operation
   * @throws If there are no records found
   */
  read: async (token, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await Invite.startTransaction();

      const response = await Invite.query(trx)
        .findById(token)
        .throwIfNotFound();

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },
};

module.exports = service;
