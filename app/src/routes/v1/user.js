/* eslint-disable no-unused-vars */
const routes = require('express').Router();

const { userController } = require('../../controllers');

/** Searches for users */
routes.get('/', (req, res, next) => {
  userController.userSearch(req, res, next);
});

module.exports = routes;
