
const Joi = require('joi');
const { InviteObjectAllowedPermissions, InviteBucketAllowedPermissions } = require('../components/constants');
const { type } = require('./common');
const { validate } = require('../middleware/validation');

const schema = {
  createInvite: {
    body: Joi.object({
      bucketId: type.uuidv4,
      email: type.email,
      expiresAt: Joi.date().timestamp('unix').greater('now'),
      objectId: type.uuidv4,
      permissionsCode: Joi.alternatives()
        .conditional('bucketId', {
          not: Joi.string().valid(''),
          then: Joi.array().items(...Object.values(InviteBucketAllowedPermissions)),
          otherwise: Joi.array().items(...Object.values(InviteObjectAllowedPermissions))
        }),

    }).xor('bucketId', 'objectId')
  },

  useInvite: {
    params: Joi.object({
      token: type.uuidv4
    })
  }
};

const validator = {
  createInvite: validate(schema.createInvite),
  useInvite: validate(schema.useInvite)
};

module.exports = validator;
module.exports.schema = schema;
