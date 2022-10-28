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
    ])('should return the same string given %j', (plaintext) => {
      const result = crypt.encrypt(plaintext);
      expect(typeof result).toEqual('string');
      expect(result).not.toContain(':');
      expect(result).toEqual(plaintext);
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
      ['1bazbam'],
      ['ZOWviyZrzhIhjSo38rtpag==:4Lq5+MmjDjK5JE7J1osSJA=='],
      ['V8nPQy/0b+Rj2NefzaY+rg==:9p1TC9i4jFZX7OXcUgUSrA=='],
      ['WnF471CEo8U4BVcHXAe2bA==:2iER6Is+gtPPCVCoAYzkOw==']
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
      ['', ''],
      ['foobar', 'foobar'],
      ['1bazbam', '1bazbam'],
      ['ZOWviyZrzhIhjSo38rtpag==:4Lq5+MmjDjK5JE7J1osSJA==', 'ZOWviyZrzhIhjSo38rtpag==:4Lq5+MmjDjK5JE7J1osSJA=='],
      ['V8nPQy/0b+Rj2NefzaY+rg==:9p1TC9i4jFZX7OXcUgUSrA==', 'V8nPQy/0b+Rj2NefzaY+rg==:9p1TC9i4jFZX7OXcUgUSrA=='],
      ['WnF471CEo8U4BVcHXAe2bA==:2iER6Is+gtPPCVCoAYzkOw==', 'WnF471CEo8U4BVcHXAe2bA==:2iER6Is+gtPPCVCoAYzkOw==']
    ])('should return %j given %j', (plaintext, ciphertext) => {
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
      ['', ''],
      ['foobar', 'foobar'],
      ['1bazbam', '1bazbam'],
      ['', 'ZOWviyZrzhIhjSo38rtpag==:4Lq5+MmjDjK5JE7J1osSJA=='],
      ['foobar', 'V8nPQy/0b+Rj2NefzaY+rg==:9p1TC9i4jFZX7OXcUgUSrA=='],
      ['1bazbam', 'WnF471CEo8U4BVcHXAe2bA==:2iER6Is+gtPPCVCoAYzkOw==']
    ])('should return %j given %j', (plaintext, ciphertext) => {
      const result = crypt.decrypt(ciphertext);
      expect(typeof result).toEqual('string');
      expect(result).toMatch(plaintext);
    });
  });
});

describe('isEncrypted', () => {
  it.each([
    [false, undefined],
    [false, true],
    [false, 2],
    [false, {}],
    [false, ''],
    [false, 'foobar'],
    [false, '1bazbam'],
    [false, 'InvalidIVLengthGarbage:4Lq5+MmjDjK5JE7J1osSJA=='],
    [true, 'ZOWviyZrzhIhjSo38rtpag==:4Lq5+MmjDjK5JE7J1osSJA=='],
    [true, 'V8nPQy/0b+Rj2NefzaY+rg==:9p1TC9i4jFZX7OXcUgUSrA=='],
    [true, 'WnF471CEo8U4BVcHXAe2bA==:2iER6Is+gtPPCVCoAYzkOw==']
  ])('should return %j given %j', (expected, content) => {
    const result = crypt.isEncrypted(content);
    expect(typeof result).toEqual('boolean');
    expect(result).toEqual(expected);
  });
});
