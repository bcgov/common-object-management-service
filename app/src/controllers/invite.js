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
      // Reject if expiresAt is more than 7 days away
      const maxExpiresAt = Math.floor(Date.now() / 1000) + 691199;
      if (req.body.expiresAt && req.body.expiresAt > maxExpiresAt) {
        const limit = new Date(maxExpiresAt * 1000).toISOString();
        const msg = `"expiresAt" must be less than "${limit}"`;
        throw new Problem(422, {
          detail: msg,
          instance: req.originalUrl,
          errors: {
            body: [{
              message: msg,
              path: ['expiresAt'],
              type: 'date.less',
              context: {
                limit: limit,
                value: new Date(req.body.expiresAt * 1000).toISOString(),
                label: 'expiresAt',
                key: 'expiresAt'
              }
            }]
          }
        });
      }

      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER), SYSTEM_USER);

      if (req.body.objectId) {
        resource = addDashesToUuid(req.body.objectId);
        type = ResourceType.OBJECT;

        // Check for object existence
        const { bucketId } = await objectService.read(resource);

        // Check for manage permission
        if (req.currentUser?.AuthType === AuthType.BEARER) {
          let bucketPermissions = [];
          const objectPermissions = await objectPermissionService.searchPermissions({
            userId: userId,
            objId: resource,
            permCode: Permissions.MANAGE
          });

          if (!objectPermissions.length && bucketId) {
            bucketPermissions = await bucketPermissionService.searchPermissions({
              userId: userId,
              bucketId: bucketId,
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
        if (req.currentUser?.AuthType === AuthType.BEARER) {
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
        userId: userId,
        permissionsCode: req.body.permissionsCode
      });
      res.status(201).json(response.token);
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
    const token = addDashesToUuid(req.params.token);

    try {
      const userId = await userService.getCurrentUserId(getCurrentIdentity(req.currentUser, SYSTEM_USER));
      const invite = await inviteService.read(token); // Check if the invite exists

      // Check if invitation is still valid
      if (invite.expiresAt < new Date().toISOString()) {
        inviteService.delete(token);
        throw new Problem(410, {
          detail: 'Invitation has expired',
          instance: req.originalUrl,
          token: token
        });
      }

      // Check for email match if the invitation specifies for it
      if (invite.email && invite.email !== req.currentUser?.tokenPayload?.email) {
        throw new Problem(403, {
          detail: 'User does not match intended recipient',
          instance: req.originalUrl
        });
      }

      if (!invite.permissionsCode) {
        throw new Problem(403, {
          detail: 'User does not have permissions',
          instance: req.originalUrl
        });
      }
      // Assign array of permCode to the bucket or object
      invite.permissionsCode.forEach(async permCode => {
        if (invite.type === ResourceType.OBJECT) {
          // Check for object existence
          await objectService.read(invite.resource).catch(() => {
            inviteService.delete(token);
            throw new Problem(409, {
              detail: `Object '${invite.resource}' not found`,
              instance: req.originalUrl,
              objectId: invite.resource
            });
          });

          // Grant invitation permission and cleanup
          await objectPermissionService.addPermissions(invite.resource, [
            { userId: userId, permCode: permCode }
          ], invite.createdBy);
        } else if (invite.type === ResourceType.BUCKET) {
          // Check for object existence
          await bucketService.read(invite.resource).catch(() => {
            inviteService.delete(token);
            throw new Problem(409, {
              detail: `Bucket '${invite.resource}' not found`,
              instance: req.originalUrl,
              bucketId: invite.resource
            });
          });

          // Grant invitation permission and cleanup
          await bucketPermissionService.addPermissions(invite.resource, [
            { userId: userId, permCode: permCode }
          ], invite.createdBy);
        }
      });

      // Cleanup invite on success
      inviteService.delete(token);
      res.status(200).json({ resource: invite.resource, type: invite.type });
    } catch (e) {
      if (e.statusCode === 404) {
        next(errorToProblem(SERVICE, new Problem(404, {
          detail: 'Invitation not found',
          instance: req.originalUrl,
          token: token
        })));
      } else {
        next(errorToProblem(SERVICE, e));
      }
    }
  }
};

module.exports = controller;
