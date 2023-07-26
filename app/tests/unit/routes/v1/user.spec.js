/* eslint-disable no-unused-vars */
const request = require('supertest');

const { expressHelper } = require('../../../common/helper');
const validator = require('../../../../src/validators/user');

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

//
// Mock middleware, we are not testing this here
//
jest.mock('../../../../src/middleware/authorization', () => ({
  checkAppMode: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../../../src/middleware/featureToggle', () => ({
  requireSomeAuth: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../../../src/validators/user');

//
// Mocks are in place, create the router
//
const router = require('../../../../src/routes/v1/user');

const { userController } = require('../../../../src/controllers');

// Express Server
const basePath = '/api/v1/user';
const app = expressHelper(basePath, router);

describe(`GET ${basePath}`, () => {
  // TODO: Ensure other middleware funcs are called once
  const validatorSpy = jest.spyOn(validator, 'searchUsers');
  const controllerSpy = jest.spyOn(userController, 'searchUsers');

  beforeEach(() => {
    validatorSpy.mockReset();
    controllerSpy.mockReset();
  });

  it('should call controller with known query params', async () => {
    validatorSpy.mockImplementation((req, res, next) => next());
    controllerSpy.mockImplementation((req, res, next) => res.status(200).end());

    const response = await request(app).get(`${basePath}`).query({
      userId: ['11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000'],
      idp: ['IDIR'],
      active: 'true'
    });

    expect(validatorSpy).toHaveBeenCalledTimes(1);
    expect(controllerSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });
});

describe(`GET ${basePath}/idpList`, () => {
  // TODO: Ensure other middleware funcs are called once
  const validatorSpy = jest.spyOn(validator, 'listIdps');
  const controllerSpy = jest.spyOn(userController, 'listIdps');

  beforeEach(() => {
    validatorSpy.mockReset();
    controllerSpy.mockReset();
  });

  it('should call controller with known query params', async () => {
    validatorSpy.mockImplementation((req, res, next) => next());
    controllerSpy.mockImplementation((req, res, next) => res.status(200).end());

    const response = await request(app).get(`${basePath}/idpList`).query({ active: 'true' });

    expect(validatorSpy).toHaveBeenCalledTimes(1);
    expect(controllerSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });

  it('should call controller with no query params', async () => {
    validatorSpy.mockImplementation((req, res, next) => next());
    controllerSpy.mockImplementation((req, res, next) => res.status(200).end());

    const response = await request(app).get(`${basePath}/idpList`);

    expect(response.statusCode).toBe(200);
    expect(validatorSpy).toHaveBeenCalledTimes(1);
    expect(controllerSpy).toHaveBeenCalledTimes(1);
  });
});
