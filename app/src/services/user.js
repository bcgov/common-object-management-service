const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

const { parseIdentityKeyClaims } = require('../components/utils');

const { IdentityProvider, User } = require('../db/models');
const utils = require('../db/models/utils');

/**
 * The User DB Service
 */
const service = {
  /**
   * @function _tokenToUser
   * Transforms JWT payload contents into a User Model object
   * @param {object} token The decoded JWT payload
   * @returns {object} An equivalent User model object
   */
  _tokenToUser: (token) => {
    const identityId = parseIdentityKeyClaims()
      .map(idKey => token[idKey])
      .filter(claims => claims) // Drop falsy values from array
      .concat(undefined)[0]; // Set undefined as last element of array

    return {
      identityId: identityId,
      username: token.identity_provider_identity ? token.identity_provider_identity : token.preferred_username,
      firstName: token.given_name,
      fullName: token.name,
      lastName: token.family_name,
      email: token.email,
      idp: token.identity_provider
    };
  },

  /**
   * @function createIdp
   * Create an identity provider record
   * @param {string} idp The identity provider code
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  createIdp: async (idp, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await IdentityProvider.startTransaction();

      const obj = {
        idp: idp,
        createdBy: SYSTEM_USER
      };

      const response = await IdentityProvider.query(trx).insertAndFetch(obj);
      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function createUser
   * Create a user DB record
   * @param {object} data Incoming user data
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  createUser: async (data, etrx = undefined) => {
    let trx;
    try {
      let response;
      trx = etrx ? etrx : await User.startTransaction();

      const exists = await User.query(trx)
        .where({ 'identityId': data.identityId, idp: data.idp })
        .first();

      if (exists) {
        response = exists;
      } else { // else add new user
        if (data.idp) { // add idp if not in db
          const identityProvider = await service.readIdp(data.idp, trx);
          if (!identityProvider) await service.createIdp(data.idp, trx);
        }

        response = await User.query(trx)
          .insert({
            userId: uuidv4(),
            identityId: data.identityId,
            username: data.username,
            fullName: data.fullName,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            idp: data.idp,
            createdBy: data.userId
          })
          .returning('*');
      }

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function getCurrentUserId
   * Gets userId (primary identifier of a user in COMS db) of currentUser.
   * if request is basic auth returns `defaultValue`
   * @param {object} identityId the identity field of the current user
   * @param {string} [defaultValue=undefined] An optional default return value
   * @returns {string} The current userId if applicable, or `defaultValue`
   */
  getCurrentUserId: async (identityId, defaultValue = undefined) => {
    // TODO: Consider conditionally skipping when identityId is undefined?
    const user = await User.query()
      .select('userId')
      .where('identityId', identityId)
      .first();

    return user && user.userId ? user.userId : defaultValue;
  },

  /**
   * @function listIdps
   * Lists all known identity providers
   * @param {boolean} [params.active] Optional boolean on user active status
   * @returns {Promise<object>} The result of running the find operation
   */
  listIdps: (params) => {
    return IdentityProvider.query()
      .modify('filterActive', params.active)
      .modify('orderDefault');
  },

  /**
   * @function login
   * Parse the user token and update the user table if necessary
   * @param {object} token The decoded JWT token payload
   * @returns {Promise<object>} The result of running the login operation
   */
  login: async (token) => {
    const newUser = service._tokenToUser(token);
    // wrap with db transaction
    return await utils.trxWrapper(async (trx) => {
      // check if user exists in db
      const oldUser = await User.query(trx)
        .where({ 'identityId': newUser.identityId, idp: newUser.idp })
        .first();

      if (!oldUser) {
        // Add user to system
        return await service.createUser(newUser, trx);
      } else {
        // Update user data if necessary
        return await service.updateUser(oldUser.userId, newUser, trx);
      }
    });
  },

  /**
   * @function readIdp
   * Gets an identity provider record
   * @param {string} code The identity provider code
   * @returns {Promise<object>} The result of running the find operation
   * @throws The error encountered upon db transaction failure
   */
  readIdp: async (code, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await IdentityProvider.startTransaction();

      const response = await IdentityProvider.query(trx).findById(code);

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function readUser
   * Gets a user record
   * @param {string} userId The userId uuid
   * @returns {Promise<object>} The result of running the find operation
   * @throws If no record is found
   */
  readUser: (userId) => {
    return User.query()
      .findById(userId)
      .throwIfNotFound();
  },

  /**
   * @function searchUsers
   * Search and filter for specific users
   * @param {string|string[]} [params.userId] Optional string or array of uuids representing the user subject
   * @param {string|string[]} [params.identityId] Optional string or array of uuids representing the user identity
   * @param {string|string[]} [params.idp] Optional string or array of identity providers
   * @param {string} [params.username] Optional username string to match on
   * @param {string} [params.email] Optional email string to match on
   * @param {string} [params.firstName] Optional firstName string to match on
   * @param {string} [params.fullName] Optional fullName string to match on
   * @param {string} [params.lastName] Optional lastName string to match on
   * @param {boolean} [params.active] Optional boolean on user active status
   * @param {string} [params.search] Optional search string to match on in username, email and fullName
   * @returns {Promise<object>} The result of running the find operation
   */
  searchUsers: (params) => {
    return User.query()
      .modify('filterUserId', params.userId)
      .modify('filterIdentityId', params.identityId)
      .modify('filterIdp', params.idp)
      .modify('filterUsername', params.username)
      .modify('filterEmail', params.email)
      .modify('filterFirstName', params.firstName)
      .modify('filterFullName', params.fullName)
      .modify('filterLastName', params.lastName)
      .modify('filterActive', params.active)
      .modify('filterSearch', params.search)
      .whereNotNull('identityId')
      .modify('orderLastFirstAscending');
  },

  /**
   * @function updateUser
   * Updates a user record only if there are changed values
   * @param {string} userId The userId uuid
   * @param {object} data Incoming user data
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the patch operation
   * @throws The error encountered upon db transaction failure
   */
  updateUser: async (userId, data, etrx = undefined) => {
    let trx;
    try {
      // Check if any user values have changed
      const oldUser = await service.readUser(userId);
      const diff = Object.entries(data).some(([key, value]) => oldUser[key] !== value);

      if (diff) { // Patch existing user
        trx = etrx ? etrx : await User.startTransaction();

        if (data.idp) {
          const identityProvider = await service.readIdp(data.idp, trx);
          if (!identityProvider) await service.createIdp(data.idp, trx);
        }

        const obj = {
          identityId: data.identityId,
          username: data.username,
          fullName: data.fullName,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          idp: data.idp,
          updatedBy: data.userId
        };

        // TODO: add support for updating userId primary key in the event it changes
        const response = await User.query(trx).patchAndFetchById(userId, obj);
        if (!etrx) await trx.commit();
        return response;
      } else { // Nothing to update
        return oldUser;
      }
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  }
};

module.exports = service;
