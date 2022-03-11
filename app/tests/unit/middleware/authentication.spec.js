const Problem = require('api-problem');
const config = require('config');

const { basicAuthConfig, currentUser, spkiWrapper } = require('../../../src/middleware/authentication');
const { AuthType } = require('../../../src/components/constants');

// Mock config library - @see https://stackoverflow.com/a/64819698
jest.mock('config');

const testRes = {
  writeHead: jest.fn(),
  end: jest.fn()
};

const testNoAuthUser = {
  authType: AuthType.NONE
};

beforeEach(() => {
  config.get.mockReset();
  config.has.mockReset();
});

describe('basicAuthConfig', () => {
  describe('authorizer', () => {
    const username = 'username';
    const password = 'password';

    beforeEach(() => {
      config.get
        .mockReturnValueOnce(username)
        .mockReturnValueOnce(password);
    });

    it('returns true if user and password match', () => {
      expect(basicAuthConfig.authorizer(username, password)).toBeTruthy();
      expect(config.get).toHaveBeenCalledTimes(2);
      expect(config.get).toHaveBeenNthCalledWith(1, 'basicAuth.username');
      expect(config.get).toHaveBeenNthCalledWith(2, 'basicAuth.password');
    });

    it('returns false if user does not match', () => {
      expect(basicAuthConfig.authorizer('garbage', password)).toBeFalsy();
      expect(config.get).toHaveBeenCalledTimes(2);
      expect(config.get).toHaveBeenNthCalledWith(1, 'basicAuth.username');
      expect(config.get).toHaveBeenNthCalledWith(2, 'basicAuth.password');
    });

    it('returns false if password does not match', () => {
      expect(basicAuthConfig.authorizer(username, 'garbage')).toBeFalsy();
      expect(config.get).toHaveBeenCalledTimes(2);
      expect(config.get).toHaveBeenNthCalledWith(1, 'basicAuth.username');
      expect(config.get).toHaveBeenNthCalledWith(2, 'basicAuth.password');
    });

    it('returns false if neither user nor password match', () => {
      expect(basicAuthConfig.authorizer('usergarbage', 'pwgarbage')).toBeFalsy();
      expect(config.get).toHaveBeenCalledTimes(2);
      expect(config.get).toHaveBeenNthCalledWith(1, 'basicAuth.username');
      expect(config.get).toHaveBeenNthCalledWith(2, 'basicAuth.password');
    });
  });

  describe('unauthorizedResponse', () => {
    it('returns a problem', () => {
      const result = basicAuthConfig.unauthorizedResponse();

      expect(result).toBeTruthy();
      expect(result).toBeInstanceOf(Problem);
      expect(result.status).toEqual(401);
    });
  });
});

describe('spkiWrapper', () => {
  it('returns the PEM format we expect', () => {
    const spki = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4CcG7WPTCF4YLHxT3bs9ilcQ6SS+A2e/PiZ9hqR0noelBCsdW0SQGOhjE7nhl2lrZ0W/o80YKMzNZ42Hmc7p0sHU3RN95OCTHvyCazC/CKM2i+gD+cAspP/Ns+hOqNmxC/XIsgD3bZ2zobNMhNy3jgDaAsbs3kOGPIwkdo/vWeo7N6fZPxOgSp6JoGBDtehuyhQ/4y2f7TnyicIvHMuc2d7Bz4GalQ/ra+GspmZ/HqL93A6c8sDHa8fqC8O+gnzpBNsCOxJcq/i3NOaGrOFMCiJwsNVc2dUcY8epcW3pwakIRLlC6D7oawbxv7c3UsXoCt4XSC0hdjwXg5kxVXHoDQIDAQAB';

    const result = spkiWrapper(spki);

    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toEqual(`-----BEGIN PUBLIC KEY-----\n${spki}\n-----END PUBLIC KEY-----`);
  });
});

describe('currentUser', () => {
  it('sets no auth as the type if no auth header', async () => {
    const testReq = {
      params: {
        someParam: 123
      },
      get: jest.fn().mockReturnValue(undefined)
    };
    const nxt = jest.fn();

    await currentUser(testReq, testRes, nxt);
    expect(testReq.get).toHaveBeenCalledTimes(1);
    expect(testReq.get).toHaveBeenCalledWith('Authorization');
    expect(testReq.currentUser).toEqual(testNoAuthUser);
    expect(nxt).toHaveBeenCalledTimes(1);
    expect(nxt).toHaveBeenCalledWith();
  });

  it('sets no auth as the type if blank auth header', async () => {
    const testReq = {
      params: {
        someParam: 123
      },
      get: jest.fn().mockReturnValue('')
    };
    const nxt = jest.fn();

    await currentUser(testReq, testRes, nxt);
    expect(testReq.get).toHaveBeenCalledTimes(1);
    expect(testReq.get).toHaveBeenCalledWith('Authorization');
    expect(testReq.currentUser).toEqual(testNoAuthUser);
    expect(nxt).toHaveBeenCalledTimes(1);
    expect(nxt).toHaveBeenCalledWith();
  });
});
