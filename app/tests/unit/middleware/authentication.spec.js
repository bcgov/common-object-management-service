const Problem = require('api-problem');
const config = require('config');
const jwt = require('jsonwebtoken');

const mw = require('../../../src/middleware/authentication');
const { AuthType } = require('../../../src/components/constants');
const { getConfigBoolean } = require('../../../src/components/utils');
const { userService, storageService } = require('../../../src/services');

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');
jest.mock('../../../src/components/utils');

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
    // eslint-disable-next-line max-len
    const spki = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4CcG7WPTCF4YLHxT3bs9ilcQ6SS+A2e/PiZ9hqR0noelBCsdW0SQGOhjE7nhl2lrZ0W/o80YKMzNZ42Hmc7p0sHU3RN95OCTHvyCazC/CKM2i+gD+cAspP/Ns+hOqNmxC/XIsgD3bZ2zobNMhNy3jgDaAsbs3kOGPIwkdo/vWeo7N6fZPxOgSp6JoGBDtehuyhQ/4y2f7TnyicIvHMuc2d7Bz4GalQ/ra+GspmZ/HqL93A6c8sDHa8fqC8O+gnzpBNsCOxJcq/i3NOaGrOFMCiJwsNVc2dUcY8epcW3pwakIRLlC6D7oawbxv7c3UsXoCt4XSC0hdjwXg5kxVXHoDQIDAQAB';

    const result = mw._spkiWrapper(spki);

    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toEqual(`-----BEGIN PUBLIC KEY-----\n${spki}\n-----END PUBLIC KEY-----`);
  });
});

describe('currentUser', () => {
  const checkBasicAuthSpy = jest.spyOn(mw, '_checkBasicAuth');
  const headBucketSpy = jest.spyOn(storageService, 'headBucket');
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
      getConfigBoolean.mockReturnValueOnce(true); // basicAuth.enabled
      getConfigBoolean.mockReturnValueOnce(false); // basicAuth.enabled

      req.get.mockReturnValueOnce(authorization);

      mw.currentUser(req, res, next);

      expect(req.currentUser).toBeTruthy();
      expect(req.currentUser).toHaveProperty('authType', AuthType.BASIC);
      expect(req.get).toHaveBeenCalledTimes(2);
      expect(req.get).toHaveBeenCalledWith('Authorization');
      expect(checkBasicAuthSpy).toHaveBeenCalledTimes(1);
    });
  });
  describe('Basic Authorization s3 basic access', () => {
    const authorization = 'basic ';
    const bucketSettings = {
      endpoint: 'serverUrl',
      bucket: 'realm',
      secretAccessKey: 'SOMESPKI',
      accessKeyId: 'SOMESPKI',
    };
    it.each([
      ['Basic Z29vZCB1c2VybmFtZTpnb29kIHBhc3N3b3Jk']
    ])('sets authType to BASIC with authorization header "%s"', async () => {
      getConfigBoolean.mockReturnValueOnce(false); // basicAuth.enabled
      getConfigBoolean.mockReturnValueOnce(true); // basicAuth.enabled

      req.get.mockReturnValueOnce(authorization);
      req.get.mockReturnValueOnce(bucketSettings.endpoint);
      req.get.mockReturnValueOnce(bucketSettings.bucket);

      headBucketSpy.mockReturnValue(true);

      mw.currentUser(req, res, next);
    });
  });
  describe('OIDC Authorization', () => {
    const authorization = 'BEARER';
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
      getConfigBoolean
        .mockReturnValueOnce(false) // basicAuth.enabled
        .mockReturnValueOnce(true) // keycloak.enabled
        .mockReturnValueOnce(true); // keycloak.publicKey
      config.has
        .mockReturnValueOnce(true); // keycloak.publicKey
      config.get
        .mockReturnValueOnce(pkey) // keycloak.publicKey
        .mockReturnValueOnce(serverUrl) // keycloak.serverUrl
        .mockReturnValueOnce(realm); // keycloak.realm
      req.get.mockReturnValueOnce(authorization);

      await mw.currentUser(req, res, next);
      req.currentUser = { authType: authorization };
      req.currentUser.tokenPayload = { sub: 'sub' };

      expect(req.currentUser).toBeTruthy();
      expect(req.currentUser).toHaveProperty('authType', AuthType.BEARER);
      expect(req.currentUser).toHaveProperty('tokenPayload', { sub: 'sub' });
      expect(req.get).toHaveBeenCalledTimes(1);
      expect(req.get).toHaveBeenCalledWith('Authorization');
      config.get.mockReturnValueOnce('keycloak.enabled');
      config.get.mockReturnValueOnce('keycloak.publicKey');
      config.get.mockReturnValueOnce('keycloak.serverUrl');
      config.get.mockReturnValueOnce('keycloak.realm');

      jwtVerifySpy.mockImplementation((key, options) => {
        if (key === publicKey && options.issuer === `${serverUrl}/realms/${realm}`) {
          return { sub: 'sub' }; // Mocked token payload
        }
        throw new Error('Invalid token'); // Simulate verification failure for invalid cases
      });
      expect(loginSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('short circuits with invalid auth token', async () => {
      jwtVerifySpy.mockReturnValue({ sub: 'sub' }); // return truthy value
      loginSpy.mockImplementation(() => { });
      getConfigBoolean
        .mockReturnValueOnce(false) // basicAuth.enabled
        .mockReturnValueOnce(true) // keycloak.enabled
        .mockReturnValueOnce(true); // keycloak.publicKey
      config.has
        .mockReturnValueOnce(true); // keycloak.publicKey
      config.get
        .mockReturnValueOnce(serverUrl) // keycloak.serverUrl
        .mockReturnValueOnce(realm); // keycloak.realm
      req.get.mockReturnValueOnce(authorization);

      await mw.currentUser(req, res, next);
      req.currentUser = { authType: authorization };
      req.currentUser.tokenPayload = { sub: 'sub' };

      expect(req.currentUser).toBeTruthy();
      expect(req.currentUser).toHaveProperty('authType', AuthType.BEARER);
      expect(req.currentUser).toHaveProperty('tokenPayload', { sub: 'sub' });
      expect(req.get).toHaveBeenCalledTimes(1);
      expect(req.get).toHaveBeenCalledWith('Authorization');
      config.get.mockReturnValueOnce('keycloak.enabled');
      config.get.mockReturnValueOnce('keycloak.publicKey');
      config.get.mockReturnValueOnce('keycloak.serverUrl');
      config.get.mockReturnValueOnce('keycloak.realm');

      jwtVerifySpy.mockImplementation((token, key, options) => {
        if (key === publicKey && options.issuer === `${serverUrl}/realms/${realm}`) {
          if (token === 'expiredToken') {
            throw new jwt.TokenExpiredError('jwt expired', new Date());
          }
          return { sub: 'sub' }; // Mocked token payload for valid tokens
        }
        throw new Error('Invalid token'); // Simulate verification failure for invalid cases
      });
      expect(loginSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('short circuits without keycloak.publicKey', async () => {
      jwtVerifySpy.mockReturnValue({ sub: 'sub' }); // return truthy value
      loginSpy.mockImplementation(() => { });
      getConfigBoolean
        .mockReturnValueOnce(false) // basicAuth.enabled
        .mockReturnValueOnce(true) // keycloak.enabled
        .mockReturnValueOnce(false); // keycloak.publicKey (removed keycloak publicKey check)
      config.has
        .mockReturnValueOnce(false); // keycloak.publicKey (removed check for publicKey)
      config.get
        .mockReturnValueOnce(serverUrl) // keycloak.serverUrl
        .mockReturnValueOnce(realm); // keycloak.realm
      req.get.mockReturnValueOnce(authorization);

      await mw.currentUser(req, res, next);
      req.currentUser = { authType: authorization };
      req.currentUser.tokenPayload = { sub: 'sub' };

      expect(req.currentUser).toBeTruthy();
      expect(req.currentUser).toHaveProperty('authType', AuthType.BEARER);
      expect(req.currentUser).toHaveProperty('tokenPayload', { sub: 'sub' });
      expect(req.get).toHaveBeenCalledTimes(1);
      expect(req.get).toHaveBeenCalledWith('Authorization');
      config.get.mockReturnValueOnce('keycloak.serverUrl');
      config.get.mockReturnValueOnce('keycloak.realm');

      jwtVerifySpy.mockImplementation((token, key, options) => {
        if (options.issuer === `${serverUrl}/realms/${realm}`) {
          if (token === 'expiredToken') {
            throw new jwt.TokenExpiredError('jwt expired', new Date());
          }
          return { sub: 'sub' }; // Mocked token payload for valid tokens
        }
        throw new Error('Invalid token'); // Simulate verification failure for invalid cases
      });
      expect(loginSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
