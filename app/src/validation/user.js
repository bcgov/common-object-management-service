const { validate, Joi } = require('express-validation');

const searchValidationSchema = {
  query: Joi.object({
    userId: Joi.array(),
    identityId: Joi.array(),
    idp: Joi.array(),
    username: Joi.string(),
    email: Joi.string().email(),
    firstName: Joi.string(),
    fullName: Joi.string(),
    lastName: Joi.string(),
    active: Joi.string().alphanum(),
    search: Joi.string()
  }).min(1),
};

const idpListValidationSchema = {
  query: Joi.object({
    active: Joi.string().alphanum(),
  }),
};

const searchValidation = validate(searchValidationSchema, { statusCode: 422, keyByField: true }, {});

const idpListValidation = validate(idpListValidationSchema, { statusCode: 422, keyByField: true }, {});

module.exports = { searchValidation, idpListValidation };
