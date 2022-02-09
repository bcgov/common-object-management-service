const service = require('./service');

const controller = {

  // -----------------------------------------------------------------------------------
  // Object stuff
  // -----------------------------------------------------------------------------------
  // Add new object
  create: async (req, res, next) => {
    try {
      // TODO: is this how we're doing this? in request?
      const objectStorageData = req.objectStorageData;
      const response = await service.create(objectStorageData, req.body, req.currentUser);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  },
  // Add new version to an objet
  updateVersion: async (req, res, next) => {
    try {
      const response = await service.updateVersion(req.params.id, req.file, req.currentUser);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  },
  // Fetch all files a user has permissions for
  fetchAll: async (req, res, next) => {
    try {
      const response = await service.fetchAll(req.currentUser);
      // obviously move this to query
      const filtered = response.filter(r => r.filePermissions && r.filePermissions.length);
      res.status(201).json(filtered);
    } catch (error) {
      next(error);
    }
  },
  // Delete a file
  delete: async (req, res, next) => {
    try {
      await service.delete(req.params.id);
      res.sendStatus(202);
    } catch (error) {
      next(error);
    }
  },
  // ---------------------------------------------------------------------/ object stuff

  // -----------------------------------------------------------------------------------
  // Permissions stuff
  // -----------------------------------------------------------------------------------
  // Toggle an object's public status
  // Share file with a user (add permissions)
  share: async (req, res, next) => {
    try {
      const response = await service.share(req);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  },


  // ----------------------------------------------------------------/ permissions stuff
};

module.exports = controller;
