const Problem = require('api-problem');
const config = require('config');
const jwt = require('jsonwebtoken');

const mw = require('../../../src/middleware/authentication');
const { AuthType } = require('../../../src/components/constants');
const { userService } = require('../../../src/services');

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
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
  jest.resetAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('_basicAuthConfig', () => {
  describe('authorizer', () => {
    const baduser = 'bad username';
    const badpw = 'bad password';
    const gooduser = 'good username';
    const goodpw = 'good password';

    beforeEach(() => {
      config.get
        .mockReturnValueOnce(gooduser) // basicAuth.username
        .mockReturnValueOnce(goodpw); // basicAuth.password
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

describe('_spkiWrapper', () => {
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
  const jwtVerifySpy = jest.spyOn(jwt, 'verify');
  const loginSpy = jest.spyOn(userService, 'login');

  let req, res, next;

  beforeEach(() => {
    checkBasicAuthSpy.mockImplementation(() => {
      return jest.fn();
    });

    req = { get: jest.fn() };
    res = {};
    next = jest.fn();
  });

  describe('No Authorization', () => {
    it.each([
      [undefined],
      [''],
      ['garbage']
    ])('sets authType to NONE with authorization header "%s"', (authorization) => {
      req.get.mockReturnValueOnce(authorization);

      mw.currentUser(req, res, next);

      expect(req.currentUser).toBeTruthy();
      expect(req.currentUser).toHaveProperty('authType', AuthType.NONE);
      expect(req.get).toHaveBeenCalledTimes(1);
      expect(req.get).toHaveBeenCalledWith('Authorization');
      expect(checkBasicAuthSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Basic Authorization', () => {
    it.each([
      ['basic '],
      ['basic garbage'],
      ['Basic Z29vZCB1c2VybmFtZTpnb29kIHBhc3N3b3Jk']
    ])('sets authType to BASIC with authorization header "%s"', async (authorization) => {
      config.has.mockReturnValueOnce(true); // basicAuth.enabled
      req.get.mockReturnValueOnce(authorization);

      mw.currentUser(req, res, next);

      expect(req.currentUser).toBeTruthy();
      expect(req.currentUser).toHaveProperty('authType', AuthType.BASIC);
      expect(req.get).toHaveBeenCalledTimes(1);
      expect(req.get).toHaveBeenCalledWith('Authorization');
      expect(config.has).toHaveBeenCalledTimes(1);
      expect(config.has).toHaveBeenNthCalledWith(1, 'basicAuth.enabled');
      expect(checkBasicAuthSpy).toHaveBeenCalledTimes(1);
      expect(checkBasicAuthSpy).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledTimes(0);
    });
  });

  describe('OIDC Authorization', () => {
    const authorization = 'bearer ';
    const serverUrl = 'serverUrl';
    const realm = 'realm';
    const spki = 'SOMESPKI';
    const publicKey = `-----BEGIN PUBLIC KEY-----\n${spki}\n-----END PUBLIC KEY-----`;

    it.each([
      ['SPKI', spki],
      ['PEM', publicKey]
    ])('sets authType to BEARER with keycloak.publicKey %s and valid auth token', async (_desc, pkey) => {
      jwtVerifySpy.mockReturnValue({ sub: 'sub' }); // return truthy value
      loginSpy.mockImplementation(() => { });
      config.has
        .mockReturnValueOnce(false) // basicAuth.enabled
        .mockReturnValueOnce(true) // keycloak.enabled
        .mockReturnValueOnce(true); // keycloak.publicKey
      config.get
        .mockReturnValueOnce(pkey) // keycloak.publicKey
        .mockReturnValueOnce(serverUrl) // keycloak.serverUrl
        .mockReturnValueOnce(realm); // keycloak.realm
      req.get.mockReturnValueOnce(authorization);

      await mw.currentUser(req, res, next);

      expect(req.currentUser).toBeTruthy();
      expect(req.currentUser).toHaveProperty('authType', AuthType.BEARER);
      expect(req.currentUser).toHaveProperty('tokenPayload', { sub: 'sub' });
      expect(req.get).toHaveBeenCalledTimes(1);
      expect(req.get).toHaveBeenCalledWith('Authorization');
      expect(config.has).toHaveBeenCalledTimes(3);
      expect(config.has).toHaveBeenNthCalledWith(1, 'basicAuth.enabled');
      expect(config.has).toHaveBeenNthCalledWith(2, 'keycloak.enabled');
      expect(config.has).toHaveBeenNthCalledWith(3, 'keycloak.publicKey');
      expect(config.get).toHaveBeenCalledTimes(3);
      expect(config.get).toHaveBeenNthCalledWith(1, 'keycloak.publicKey');
      expect(config.get).toHaveBeenNthCalledWith(2, 'keycloak.serverUrl');
      expect(config.get).toHaveBeenNthCalledWith(3, 'keycloak.realm');
      expect(checkBasicAuthSpy).toHaveBeenCalledTimes(0);
      expect(jwtVerifySpy).toHaveBeenCalledTimes(1);
      expect(jwtVerifySpy).toHaveBeenCalledWith(expect.any(String), publicKey, expect.objectContaining({
        issuer: `${serverUrl}/realms/${realm}`
      }));
      expect(loginSpy).toHaveBeenCalledTimes(1);
      expect(loginSpy).toHaveBeenCalledWith(expect.objectContaining({ sub: 'sub' }));
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('short circuits with invalid auth token', async () => {
      const authorization = 'bearer ';

      config.has
        .mockReturnValueOnce(false) // basicAuth.enabled
        .mockReturnValueOnce(true) // keycloak.enabled
        .mockReturnValueOnce(true); // keycloak.publicKey
      config.get
        .mockReturnValueOnce(spki) // keycloak.publicKey
        .mockReturnValueOnce(serverUrl) // keycloak.serverUrl
        .mockReturnValueOnce(realm); // keycloak.realm
      req.get.mockReturnValueOnce(authorization);

      await mw.currentUser(req, res, next);

      expect(req.currentUser).toBeFalsy();
      expect(req.get).toHaveBeenCalledTimes(1);
      expect(req.get).toHaveBeenCalledWith('Authorization');
      expect(config.has).toHaveBeenCalledTimes(3);
      expect(config.has).toHaveBeenNthCalledWith(1, 'basicAuth.enabled');
      expect(config.has).toHaveBeenNthCalledWith(2, 'keycloak.enabled');
      expect(config.has).toHaveBeenNthCalledWith(3, 'keycloak.publicKey');
      expect(checkBasicAuthSpy).toHaveBeenCalledTimes(0);
      expect(jwtVerifySpy).toHaveBeenCalledTimes(1);
      expect(jwtVerifySpy).toHaveBeenCalledWith(expect.any(String), publicKey, expect.objectContaining({
        issuer: `${serverUrl}/realms/${realm}`
      }));
      expect(loginSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(Object));
    });

    it('short circuits without keycloak.publicKey', async () => {
      jwtVerifySpy.mockReturnValue({ sub: 'sub' });
      loginSpy.mockImplementation(() => { });
      config.has
        .mockReturnValueOnce(false) // basicAuth.enabled
        .mockReturnValueOnce(true) // keycloak.enabled
        .mockReturnValueOnce(false); // keycloak.publicKey
      req.get.mockReturnValueOnce(authorization);

      await mw.currentUser(req, res, next);

      expect(req.currentUser).toBeFalsy();
      expect(req.get).toHaveBeenCalledTimes(1);
      expect(req.get).toHaveBeenCalledWith('Authorization');
      expect(config.has).toHaveBeenCalledTimes(3);
      expect(config.has).toHaveBeenNthCalledWith(1, 'basicAuth.enabled');
      expect(config.has).toHaveBeenNthCalledWith(2, 'keycloak.enabled');
      expect(config.has).toHaveBeenNthCalledWith(3, 'keycloak.publicKey');
      expect(checkBasicAuthSpy).toHaveBeenCalledTimes(0);
      expect(jwtVerifySpy).toHaveBeenCalledTimes(0);
      expect(loginSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(Object));
    });
  });
});
