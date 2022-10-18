const config = require('config');
const crypt = require('../../../src/components/crypt');

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

beforeEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// General testing constants
const passphrase = 'passphrase';

describe('encrypt', () => {
  describe('without a passphrase', () => {
    beforeEach(() => {
      config.has.mockReturnValueOnce(false); // server.passphrase
    });

    it.each([
      [''],
      ['foobar'],
      ['1bazbam']
    ])('should return a string given %j', (plaintext) => {
      const result = crypt.encrypt(plaintext);
      expect(result).toBeTruthy();
      expect(typeof result).toEqual('string');
      expect(result).toContain(':');

      const [iv, encrypted] = result.split(':');
      expect(iv).toEqual(expect.any(String));
      expect(encrypted).toEqual(expect.any(String));
    });
  });

  describe('with a passphrase', () => {
    beforeEach(() => {
      config.has.mockReturnValueOnce(true); // server.passphrase
      config.get.mockReturnValueOnce(passphrase); // server.passphrase
    });

    it.each([
      [''],
      ['foobar'],
      ['1bazbam']
    ])('should return a string given %j', (plaintext) => {
      const result = crypt.encrypt(plaintext);
      expect(result).toBeTruthy();
      expect(typeof result).toEqual('string');
      expect(result).toContain(':');

      const [iv, encrypted] = result.split(':');
      expect(iv).toEqual(expect.any(String));
      expect(encrypted).toEqual(expect.any(String));
    });
  });
});

describe('decrypt', () => {
  describe('without a passphrase', () => {
    beforeEach(() => {
      config.has.mockReturnValueOnce(false); // server.passphrase
    });

    it.each([
      ['qYSUumi8L5ypY920HES5sQ==:', ''],
      ['JWzCHAxVecObsBLSMG/Cdg==:Zm9vYmFy', 'foobar'],
      ['xCEUr5OoZOnOj87XGRU74Q==:MWJhemJhbQ==', '1bazbam']
    ])('should return a string given %j', (ciphertext, plaintext) => {
      const result = crypt.decrypt(ciphertext);
      expect(typeof result).toEqual('string');
      expect(result).toMatch(plaintext);
    });
  });

  describe('with a passphrase', () => {
    beforeEach(() => {
      config.has.mockReturnValueOnce(true); // server.passphrase
      config.get.mockReturnValueOnce(passphrase); // server.passphrase
    });

    it.each([
      ['ZOWviyZrzhIhjSo38rtpag==:4Lq5+MmjDjK5JE7J1osSJA==', ''],
      ['V8nPQy/0b+Rj2NefzaY+rg==:9p1TC9i4jFZX7OXcUgUSrA==', 'foobar'],
      ['WnF471CEo8U4BVcHXAe2bA==:2iER6Is+gtPPCVCoAYzkOw==', '1bazbam']
    ])('should return a string given %j', (ciphertext, plaintext) => {
      const result = crypt.decrypt(ciphertext);
      expect(typeof result).toEqual('string');
      expect(result).toMatch(plaintext);
    });
  });
});
