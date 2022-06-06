const { Joi } = require('express-validation');
const { Permissions } = require('../components/constants');

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
  Joi.array().items(Joi.string().max(255).valid(
    Permissions.CREATE,
    Permissions.READ,
    Permissions.UPDATE,
    Permissions.DELETE,
    Permissions.MANAGE
  )),
  Joi.string().max(255).valid(
    Permissions.CREATE,
    Permissions.READ,
    Permissions.UPDATE,
    Permissions.DELETE,
    Permissions.MANAGE
  )
);

module.exports = { uuidv4, uuidv4MultiModel, stringMultiModel, permCodeMultiModel };
