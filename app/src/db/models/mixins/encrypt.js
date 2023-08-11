const { encrypt, decrypt } = require('../../../components/crypt');

/**
 * Encrypt Objection Model Plugin
 * Add column encryption handlers to an Objection Model
 *
 * This class will automatically encrypt and decrypt specified column fields
 * during insert/update/get operations transparently.
 * Inspired by @see {@link https://github.com/Dialogtrail/objection-encrypt}
 *
 * @see module:knex
 * @see module:objection
 */
const Encrypt = opts => {
  // Provide good default options if possible.
  const options = Object.assign(
    {
      fields: []
    },
    opts
  );

  // Return the mixin
  return Model => {
    return class extends Model {
      async $beforeInsert(context) {
        await super.$beforeInsert(context);
        this.encryptFields();
      }
      async $afterInsert(context) {
        await super.$afterInsert(context);
        return this.decryptFields();
      }
      async $beforeUpdate(queryOptions, context) {
        await super.$beforeUpdate(queryOptions, context);
        this.encryptFields();
      }
      async $afterUpdate(queryOptions, context) {
        await super.$afterUpdate(queryOptions, context);
        return this.decryptFields();
      }
      async $afterFind(context) {
        await super.$afterFind(context);
        return this.decryptFields();
      }

      /**
       * Encrypts specified fields
       */
      encryptFields() {
        options.fields.forEach(field => {
          const value = this[field];
          if (value) this[field] = encrypt(value);
        });
      }

      /**
       * Decrypts specified fields
       */
      decryptFields() {
        options.fields.forEach(field => {
          const value = this[field];
          if (value) this[field] = decrypt(value);
        });
      }
    };
  };
};

module.exports = Encrypt;
