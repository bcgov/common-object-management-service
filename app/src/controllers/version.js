const { NIL: SYSTEM_USER } = require('uuid');
const errorToProblem = require('../components/errorToProblem');
const { addDashesToUuid, getCurrentIdentity, getMetadata, mixedQueryToArray, getPrivacyMask } = require('../components/utils');
const { metadataService, tagService, userService } = require('../services');

const SERVICE = 'VersionService';

/**
 * The Version Controller
 */
const controller = {
  /**
   * @function fetchMetadata
   * Lists metadata for an array of versions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async fetchMetadata(req, res, next) {
    try {
      const versionIds = mixedQueryToArray(req.query.versionId);
      const metadata = getMetadata(req.headers);

      const params = {
        versionIds: versionIds ? versionIds.map(id => addDashesToUuid(id)) : versionIds,
        metadata: metadata && Object.keys(metadata).length ? metadata : undefined,
      };
      // if scoping to current user permissions on objects
      if (getPrivacyMask) {
        params.userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      }
      const response = await metadataService.fetchMetadataForVersion(params);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function fetchTags
   * Lists tags for an array of versions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async fetchTags(req, res, next) {
    try {
      const versionIds = mixedQueryToArray(req.query.versionId);
      const tagging = req.query.tagset;

      const params = {
        versionIds: versionIds ? versionIds.map(id => addDashesToUuid(id)) : versionIds,
        tags: tagging && Object.keys(tagging).length ? tagging : undefined,
      };
      // if scoping to current user permissions on objects
      if (getPrivacyMask) {
        params.userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      }
      const response = await tagService.fetchTagsForVersion(params);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

};

module.exports = controller;
