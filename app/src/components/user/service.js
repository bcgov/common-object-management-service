const { User } = require('../../db/models');

const service = {

  // Get objects out of token and handle "public" unauthed
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

      //TODO: I can't figure out why idp and identity below are coming in blank with the client I'm testing with
      // on CHEFS for exampe these are populated. Need to figure out the setup difference?
      // Hard code for now
      const idpHack = idp ? idp : 'idir';

      return {
        keycloakId: keycloakId,
        username: identity ? identity : username,
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        email: email,
        idp: idpHack,
        // idp: idp ? idp : '',
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
      user = await service.updateUser(user.id, obj);
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
  // TODO, this is failing with the toISOString issue at the moment, see knexfile
  readUser: async (oidcId) => {
    return User.query()
      .findById(oidcId)
      .throwIfNotFound();
  },
};

module.exports = service;
