const config = require('config');
const errorToProblem = require('../components/errorToProblem');
const { getMetadata } = require('../components/utils');
const { metadataService } = require('../services');

const SERVICE = 'MetadataService';

/**
 * The Metadata Controller
 */
const controller = {
  /**
   * @function searchMetadata
   * Search and filter for specific metadata
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async searchMetadata(req, res, next) {
    try {
      const metadata = getMetadata(req.headers);
      const params = {
        metadata: metadata && Object.keys(metadata).length ? metadata : undefined,
        privacyMask : req.currentUser.authType !== 'BASIC' ? config.has('server.privacyMask') : false
      };

      const response = await metadataService.searchMetadata(params);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },
};

module.exports = controller;
