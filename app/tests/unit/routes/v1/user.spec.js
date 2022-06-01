const request = require('supertest');

const { expressHelper } = require('../../../common/helper');
const validator = require('../../../../src/validator/user');

//
// Mock middleware, we are not testing this here
//
jest.mock('../../../../src/middleware/authorization', () => ({
  checkAppMode: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../../../src/middleware/featureToggle', () => ({
  requireDb: jest.fn((_req, _res, next) => next()),
  requireSomeAuth: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../../../src/validator/user');

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
  // TODO: Ensure other middleware funcs are called once
  const validatorSearchUserSpy = jest.spyOn(validator, 'searchUsers');
  const ctrlrSearchUserSpy = jest.spyOn(userController, 'searchUsers');

  beforeEach(() => {
    validatorSearchUserSpy.mockReset();
    ctrlrSearchUserSpy.mockReset();
  });

  it('should call controller with known query params', async () => {
    // eslint-disable-next-line no-unused-vars
    validatorSearchUserSpy.mockImplementation((_req, _res, next) => next());
    // eslint-disable-next-line no-unused-vars
    ctrlrSearchUserSpy.mockImplementation((req, res, next) => res.status(200).end());

    const response = await request(app).get(`${basePath}`).query({
      userId: ['11bf5b37-e0b8-42e0-8dcf-dc8c4aefc000'],
      idp: ['IDIR'],
      active: 'true'
    });

    expect(validatorSearchUserSpy).toHaveBeenCalledTimes(1);
    expect(ctrlrSearchUserSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });
});

describe(`GET ${basePath}/idpList`, () => {
  // TODO: Ensure other middleware funcs are called once
  const validatorListIdpsSpy = jest.spyOn(validator, 'listIdps');
  const ctrlrListIdpsSpy = jest.spyOn(userController, 'listIdps');

  beforeEach(() => {
    validatorListIdpsSpy.mockReset();
    ctrlrListIdpsSpy.mockReset();
  });

  it('should call controller with known query params', async () => {
    // eslint-disable-next-line no-unused-vars
    validatorListIdpsSpy.mockImplementation((_req, _res, next) => next());
    // eslint-disable-next-line no-unused-vars
    ctrlrListIdpsSpy.mockImplementation((req, res, next) => res.status(200).end());

    const response = await request(app).get(`${basePath}/idpList`).query({ active: 'true' });

    expect(validatorListIdpsSpy).toHaveBeenCalledTimes(1);
    expect(ctrlrListIdpsSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });

  it('should call controller with no query params', async () => {
    // eslint-disable-next-line no-unused-vars
    validatorListIdpsSpy.mockImplementation((_req, _res, next) => next());
    // eslint-disable-next-line no-unused-vars
    ctrlrListIdpsSpy.mockImplementation((req, res, next) => res.status(200).end());

    const response = await request(app).get(`${basePath}/idpList`);

    expect(response.statusCode).toBe(200);
    expect(validatorListIdpsSpy).toHaveBeenCalledTimes(1);
    expect(ctrlrListIdpsSpy).toHaveBeenCalledTimes(1);
  });
});
