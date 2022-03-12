const Problem = require('api-problem');
const config = require('config');

const mw = require('../../../src/middleware/authentication');
const { AuthType } = require('../../../src/components/constants');

// Mock config library - @see https://stackoverflow.com/a/64819698
jest.mock('config');
// We need to create a higher order mock to properly intercept this library
jest.mock('express-basic-auth', () => {
  function buildMiddleware() {
    return jest.fn();
  }
  buildMiddleware.safeCompare = jest.requireActual('express-basic-auth').safeCompare;
  return buildMiddleware;
});

beforeEach(() => {
  config.get.mockReset();
  config.has.mockReset();
});

describe('_basicAuthConfig', () => {
  describe('authorizer', () => {
    const baduser = 'bad username';
    const badpw = 'bad password';
    const gooduser = 'good username';
    const goodpw = 'good password';

    beforeEach(() => {
      config.get
        .mockReturnValueOnce(gooduser)
        .mockReturnValueOnce(goodpw);
    });

    it.each([
      [1, gooduser, goodpw],
      [0, baduser, goodpw],
      [0, gooduser, badpw],
      [0, baduser, badpw]
    ])('returns %s with %s and %s', (expected, user, pw) => {
      expect(mw._basicAuthConfig.authorizer(user, pw)).toBe(expected);
      expect(config.get).toHaveBeenCalledTimes(2);
      expect(config.get).toHaveBeenNthCalledWith(1, 'basicAuth.username');
      expect(config.get).toHaveBeenNthCalledWith(2, 'basicAuth.password');
    });
  });

  describe('unauthorizedResponse', () => {
    it('returns a problem', () => {
      const result = mw._basicAuthConfig.unauthorizedResponse();

      expect(result).toBeTruthy();
      expect(result).toBeInstanceOf(Problem);
      expect(result.status).toEqual(401);
      expect(result.detail).toMatch('Invalid authorization credentials');
    });
  });
});

describe('_checkBasicAuth', () => {
  it('is a function', () => {
    expect(mw._checkBasicAuth).toBeTruthy();
    expect(typeof mw._checkBasicAuth).toBe('function');
  });
});

describe('spkiWrapper', () => {
  it('returns the PEM format we expect', () => {
    const spki = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4CcG7WPTCF4YLHxT3bs9ilcQ6SS+A2e/PiZ9hqR0noelBCsdW0SQGOhjE7nhl2lrZ0W/o80YKMzNZ42Hmc7p0sHU3RN95OCTHvyCazC/CKM2i+gD+cAspP/Ns+hOqNmxC/XIsgD3bZ2zobNMhNy3jgDaAsbs3kOGPIwkdo/vWeo7N6fZPxOgSp6JoGBDtehuyhQ/4y2f7TnyicIvHMuc2d7Bz4GalQ/ra+GspmZ/HqL93A6c8sDHa8fqC8O+gnzpBNsCOxJcq/i3NOaGrOFMCiJwsNVc2dUcY8epcW3pwakIRLlC6D7oawbxv7c3UsXoCt4XSC0hdjwXg5kxVXHoDQIDAQAB';

    const result = mw._spkiWrapper(spki);

    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toEqual(`-----BEGIN PUBLIC KEY-----\n${spki}\n-----END PUBLIC KEY-----`);
  });
});

describe('currentUser', () => {
  const checkBasicAuthSpy = jest.spyOn(mw, '_checkBasicAuth');
  const problemSendSpy = jest.spyOn(Problem.prototype, 'send');

  const req = { get: jest.fn() };
  const res = {};
  const next = jest.fn();

  beforeEach(() => {
    checkBasicAuthSpy.mockReset().mockImplementation(() => {
      return jest.fn();
    });
    problemSendSpy.mockReset();
    req.get.mockReset();
    next.mockReset();
  });

  afterAll(() => {
    checkBasicAuthSpy.mockRestore();
  });

  it.each([
    [undefined],
    [''],
    ['garbage']
  ])('sets authType to NONE with authorization header "%s"', (authorization) => {
    req.get.mockReturnValue(authorization);

    mw.currentUser(req, res, next);

    expect(req.currentUser).toBeTruthy();
    expect(req.currentUser).toEqual(expect.objectContaining({ authType: AuthType.NONE }));
    expect(req.get).toHaveBeenCalledTimes(1);
    expect(req.get).toHaveBeenCalledWith('Authorization');
    expect(checkBasicAuthSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(problemSendSpy).toHaveBeenCalledTimes(0);
  });

  it.each([
    ['basic garbage'],
    ['Basic Z29vZCB1c2VybmFtZTpnb29kIHBhc3N3b3Jk']
  ])('sets authType to BASIC with authorization header "%s"', async (authorization) => {
    config.has.mockReturnValueOnce(true);
    req.get.mockReturnValue(authorization);

    mw.currentUser(req, res, next);

    expect(req.currentUser).toBeTruthy();
    expect(req.currentUser).toEqual(expect.objectContaining({ authType: AuthType.BASIC }));
    expect(config.has).toHaveBeenCalledTimes(1);
    expect(config.has).toHaveBeenNthCalledWith(1, 'basicAuth.enabled');
    expect(req.get).toHaveBeenCalledTimes(1);
    expect(req.get).toHaveBeenCalledWith('Authorization');
    expect(checkBasicAuthSpy).toHaveBeenCalledTimes(1);
    expect(checkBasicAuthSpy).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledTimes(0);
    expect(problemSendSpy).toHaveBeenCalledTimes(0);
  });
});
