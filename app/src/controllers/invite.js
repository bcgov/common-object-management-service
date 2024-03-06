const Problem = require('api-problem');
const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');

const { AuthType, Permissions, ResourceType } = require('../components/constants');
const errorToProblem = require('../components/errorToProblem');
const { addDashesToUuid, getCurrentIdentity } = require('../components/utils');
const {
  bucketPermissionService,
  bucketService,
  inviteService,
  objectPermissionService,
  objectService,
  userService
} = require('../services');

const SERVICE = 'InviteService';

/**
 * The Invite Controller
 */
const controller = {
  /**
   * @function createInvite
   * Creates an invitation token
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async createInvite(req, res, next) {
    let resource, type;

    try {
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);

      if (req.body.objectId) {
        resource = addDashesToUuid(req.body.objectId);
        type = ResourceType.OBJECT;

        // Check for object existence
        const object = await objectService.read(resource);

        // Check for manage permission
        if (req.currentUser.AuthType === AuthType.BEARER) {
          let bucketPermissions = [];
          const objectPermissions = await objectPermissionService.searchPermissions({
            userId: userId,
            objId: resource,
            permCode: Permissions.MANAGE
          });
          
          if (!objectPermissions.length && object.bucketId) {
            bucketPermissions = await bucketPermissionService.searchPermissions({
              userId: userId,
              bucketId: object.bucketId,
              permCode: Permissions.MANAGE
            });
          }

          if (!objectPermissions.length && !bucketPermissions.length) {
            throw new Problem(403, {
              detail: `User lacks ${Permissions.MANAGE} permission for the object`,
              instance: req.originalUrl,
              objectId: resource
            });
          }
        }
      } else if (req.body.bucketId) {
        resource = addDashesToUuid(req.body.bucketId);
        type = ResourceType.BUCKET;

        // Check for bucket existence
        await bucketService.read(resource);

        // Check for manage permission
        if (req.currentUser.AuthType === AuthType.BEARER) {
          const bucketPermissions = await bucketPermissionService.searchPermissions({
            userId: userId,
            bucketId: resource,
            permCode: Permissions.MANAGE
          });

          if (!bucketPermissions.length) {
            throw new Problem(403, {
              detail: `User lacks ${Permissions.MANAGE} permission for the bucket`,
              instance: req.originalUrl,
              bucketId: resource
            });
          }
        }
      }

      const response = await inviteService.create({
        token: uuidv4(),
        email: req.body.email,
        resource: resource,
        type: type,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt * 1000).toISOString() : undefined,
        userId: userId
      });
      res.status(200).json(response.token);
    } catch (e) {
      if (e.statusCode === 404) {
        next(errorToProblem(SERVICE, new Problem(409, {
          detail: `Resource type '${type}' not found`,
          instance: req.originalUrl,
          resource: resource
        })));
      } else {
        next(errorToProblem(SERVICE, e));
      }
    }
  },

  /**
   * @function useInvite
   * Uses an invitation token
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async useInvite(req, res, next) {
    try {
      const token = addDashesToUuid(req.params.token);

      const response = await inviteService.read(token); // Check if the invite exists
      // TODO: Put in actual permission business logic
      res.status(201).json({
        response: response.resource,
        type: response.type
      });
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  }
};

module.exports = controller;
