const { Joi } = require('express-validation');
const { Permissions } = require('../components/constants');

const alphanumModel = Joi.string().alphanum().max(255);

const truthyModel = Joi.boolean()
  .truthy('true', 1, '1', 't', 'yes', 'y', 'false', 0, '0', 'f', 'no', 'n');

const uuidv4 = Joi.string().guid({
  version: 'uuidv4'
});

const uuidv4MultiModel =  Joi.alternatives().try(
  Joi.array().items(uuidv4),
  uuidv4
);

const stringMultiModel = Joi.alternatives().try(
  Joi.array().items(Joi.string().max(255)),
  Joi.string().max(255)
);

const permCodeMultiModel = Joi.alternatives().try(
  Joi.array().items(Joi.string().max(255).valid(...Object.values(Permissions))),
  Joi.string().max(255).valid(...Object.values(Permissions))
);

module.exports = { alphanumModel, truthyModel, uuidv4, uuidv4MultiModel, stringMultiModel, permCodeMultiModel };
