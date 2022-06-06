const { Joi } = require('express-validation');

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

module.exports = { uuidv4, uuidv4MultiModel, stringMultiModel };
