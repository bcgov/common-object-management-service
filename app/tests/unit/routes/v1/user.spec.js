const request = require('supertest');

const { expressHelper } = require('../../../common/helper');

//
// Mock middleware, we are not testing this here
//
const authorization = require('../../../../src/middleware/authorization');
const featureToggle = require('../../../../src/middleware/featureToggle');

authorization.checkAppMode = jest.fn((_req, _res, next) => {
  next();
});

featureToggle.requireDb = jest.fn((_req, _res, next) => {
  next();
});

featureToggle.requireSomeAuth = jest.fn((_req, _res, next) => {
  next();
});

//
// Mocks are in place, create the router
//
const router = require('../../../../src/routes/v1/user');

const { userController } = require('../../../../src/controllers');

// Express Server
const basePath = '/api/v1/user';
const app = expressHelper(basePath, router);

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

describe(`GET ${basePath}`, () => {
  const spy = jest.spyOn(userController, 'searchUsers');

  beforeEach(() => {
    spy.mockReset();
  });

  it('should fail validation when given no query parameters', async () => {
    // eslint-disable-next-line no-unused-vars
    spy.mockImplementation((req, res, next) => res.status(200).end());
    const response = await request(app).get(`${basePath}`);

    expect(response.statusCode).toBe(422);
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it('should fail validation when given unknown query param', async () => {
    // eslint-disable-next-line no-unused-vars
    spy.mockImplementation((req, res, next) => res.status(200).end());
    const response = await request(app).get(`${basePath}`).query({ unknownParam: 'true' });

    expect(response.statusCode).toBe(422);
    expect(spy).toHaveBeenCalledTimes(0);
  });
});

describe(`GET ${basePath}/idpList`, () => {
  const spy = jest.spyOn(userController, 'listIdps');

  beforeEach(() => {
    spy.mockReset();
  });

  it('should pass validation with no query and call controller', async () => {
    // eslint-disable-next-line no-unused-vars
    spy.mockImplementation((req, res, next) => res.status(200).end());
    const response = await request(app).get(`${basePath}/idpList`);

    expect(response.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should pass validation with known query params', async () => {
    // eslint-disable-next-line no-unused-vars
    spy.mockImplementation((req, res, next) => res.status(200).end());
    const response = await request(app).get(`${basePath}/idpList`).query({ active: 'true' });

    expect(response.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should fail validation when given unknown query param', async () => {
    // eslint-disable-next-line no-unused-vars
    spy.mockImplementation((req, res, next) => res.status(200).end());
    const response = await request(app).get(`${basePath}/idpList`).query({ unknownParam: 'true' });

    expect(response.statusCode).toBe(422);
    expect(spy).toHaveBeenCalledTimes(0);
  });
});
