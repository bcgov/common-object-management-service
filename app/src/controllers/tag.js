const config = require('config');
const errorToProblem = require('../components/errorToProblem');
const { tagService } = require('../services');

const SERVICE = 'TagService';

/**
 * The Tag Controller
 */
const controller = {

  /**
   * @function searchTags
   * Search and filter for specific tags
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async searchTags(req, res, next) {
    try {
      const tagging = req.query.tagset;
      const params = {
        tag: tagging && Object.keys(tagging).length ? tagging : undefined,
        privacyMask : req.currentUser.authType !== 'BASIC' ? config.has('server.privacyMask') : false
      };

      const response = await tagService.searchTags(params);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

};

module.exports = controller;
