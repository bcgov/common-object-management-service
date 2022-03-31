const { NIL: SYSTEM_USER } = require('uuid');

const { parseIdentityKeyClaims } = require('../components/utils');
const { IdentityProvider, User } = require('../db/models');

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
  _tokenToUser: (token) => ({
    userId: token.sub,
    identityId: parseIdentityKeyClaims()
      .map(idKey => token[idKey])
      .filter(claims => claims) // Drop falsy values from array
      .concat(undefined)[0], // Set undefined as last element of array
    username: token.identity_provider_identity ? token.identity_provider_identity : token.preferred_username,
    firstName: token.given_name,
    fullName: token.name,
    lastName: token.family_name,
    email: token.email,
    idp: token.identity_provider
  }),

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
      trx = etrx ? etrx : await User.startTransaction();

      if (data.idp) {
        const identityProvider = await service.readIdp(data.idp);
        if (!identityProvider) await service.createIdp(data.idp, trx);
      }

      const obj = {
        userId: data.userId,
        identityId: data.identityId,
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        idp: data.idp,
        createdBy: data.userId
      };

      const response = await User.query(trx).insertAndFetch(obj);
      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function login
   * Parse the user token and update the user table if necessary
   * @param {object} token The decoded JWT token payload
   * @returns {Promise<object>} The result of running the login operation
   */
  login: async (token) => {
    const newUser = service._tokenToUser(token);
    const oldUser = await User.query().findById(newUser.userId);

    if (!oldUser) {
      // Add user to system
      return service.createUser(newUser);
    } else {
      // Update user data if necessary
      return service.updateUser(oldUser.userId, newUser);
    }
  },

  /**
   * @function readIdp
   * Gets an identity provider record
   * @param {string} code The identity provider code
   * @returns {Promise<object>} The result of running the find operation
   */
  readIdp: (code) => {
    return IdentityProvider.query().findById(code);
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
          const identityProvider = await service.readIdp(data.idp);
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
