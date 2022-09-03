const { Joi } = require('express-validation');
const { Permissions } = require('../components/constants');

/**
 * @function oneOrMany
 * Permits either a model or an array of models
 * @param {any|any[]} param The model to process
 * @returns {object} A Joi object
 */
function oneOrMany(param) {
  return Joi.alternatives().try(
    Joi.array().items(param),
    param
  );
}

/**
 * @constant type
 * Base Joi model definitions
 */
const type = {
  alphanum: Joi.string().alphanum().max(255),

  truthy: Joi.boolean()
    .truthy('true', 1, '1', 't', 'yes', 'y', 'false', 0, '0', 'f', 'no', 'n'),

  email: Joi.string().max(255).email(),

  uuidv4: Joi.string().guid({
    version: 'uuidv4'
  }),

  metadata: (min) => Joi.object()
    .pattern(/^x-amz-meta-.{1,255}$/i, Joi.string().min(min).max(255))
    .unknown(),

  tagset: (min) => Joi.object().pattern(/^.{1,128}$/, Joi.string().min(min).max(255))
};

/**
 * @constant scheme
 * Composite Joi model definitions
 */
const scheme = {
  guid: oneOrMany(type.uuidv4),

  string: oneOrMany(Joi.string().max(255)),

  permCode: oneOrMany(Joi.string().valid(...Object.values(Permissions)))
};

module.exports = { oneOrMany, scheme, type };
