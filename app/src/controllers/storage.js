const errorToProblem = require('../components/errorToProblem');
const { storageService } = require('../services');

const SERVICE = 'StorageService';

/**
 * The Storage Controller
 */
const controller = {
  async getEncryption(req, res, next) {
    try {
      const response = await storageService.getBucketEncryption();
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  async putEncryption(req, res, next) {
    try {
      const response = await storageService.putBucketEncryption();
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },
};

module.exports = controller;
