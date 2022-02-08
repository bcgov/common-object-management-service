const { User } = require('../../db/models');

const service = {

  // Get objects out of token and handle "public" unauthed
  // TODO: Update object values to not be called "keycloakId" (artifact from CHEFS)
  _parseToken: (token) => {
    try {
      // identity_provider_* will be undefined if user login is to local keycloak (userid/password)

      const {
        identity_provider_identity: identity,
        identity_provider: idp,
        preferred_username: username,
        given_name: firstName,
        family_name: lastName,
        sub: keycloakId,
        name: fullName,
        email
      } = token.content;

      return {
        keycloakId: keycloakId,
        username: identity ? identity : username,
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        email: email,
        idp: idp ? idp : '',
        public: false
      };
    } catch (e) {
      // any issues parsing the token, or if token doesn't exist, return a default "public" user
      return {
        keycloakId: undefined,
        username: 'public',
        firstName: undefined,
        lastName: undefined,
        fullName: 'public',
        email: undefined,
        idp: 'public',
        public: true
      };
    }
  },

  // Create a user DB record
  // TODO: Update to use wrapping etrx design
  createUser: async (data) => {
    let trx;
    try {
      trx = await User.startTransaction();

      const obj = {
        oidcId: data.keycloakId,
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        idp: data.idp,
        createdBy: data.keycloakId
      };

      await User.query(trx).insert(obj);
      await trx.commit();
      const result = await service.readUser(obj.oidcId);
      return result;
    } catch (err) {
      if (trx) await trx.rollback();
      throw err;
    }
  },

  // Get the user from the DB or record them in there if new
  // TODO: Update to use wrapping etrx design
  initUserId: async (userInfo) => {
    if (userInfo.public) {
      return { id: 'public', ...userInfo };
    }

    const obj = { ...userInfo };

    // if this user does not exists, add...
    let user = await User.query()
      .first()
      .where('oidcId', obj.keycloakId);

    if (!user) {
      // add to the system.
      user = await service.createUser(obj);
    } else {
      // what if name or email changed?
      user = await service.updateUser(user.oidcId, obj);
    }

    // return with the db id...
    return { id: user.id, usernameIdp: user.idpCode ? `${user.username}@${user.idpCode}` : user.username, ...userInfo };
  },

  // "Log" the user in, IE parse their token and record them in the user table if not already there
  login: async (token) => {
    const userInfo = service._parseToken(token);
    const user = await service.initUserId(userInfo);
    return user;
  },

  // Get a user record
  readUser: async (oidcId) => {
    return User.query()
      .findById(oidcId)
      .throwIfNotFound();
  },

  // TODO: Update to use wrapping etrx design
  updateUser: async (oidcId, data) => {
    let trx;
    try {
      const obj = await service.readUser(oidcId);
      trx = await User.startTransaction();

      const update = {
        oidcId: data.keycloakId,
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        idp: data.idp
      };

      await User.query(trx).patchAndFetchById(obj.oidcId, update);
      await trx.commit();
      const result = await service.readUser(oidcId);
      return result;
    } catch (err) {
      if (trx) await trx.rollback();
      throw err;
    }
  }
};

module.exports = service;
