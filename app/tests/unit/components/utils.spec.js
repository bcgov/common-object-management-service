const config = require('config');

const { AuthMode, AuthType } = require('../../../src/components/constants');
const { bucketService, objectService } = require('../../../src/services');
const utils = require('../../../src/components/utils');
const Problem = require('api-problem');

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

const DEFAULTREGION = 'us-east-1'; // Need to specify valid AWS region or it'll explode ('us-east-1' is default, 'ca-central-1' for Canada)

beforeEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('addDashesToUuid', () => {
  it.each([
    [undefined, undefined],
    [null, null],
    [123, 123],
    [{}, {}],
    ['123456789012345678901234567890', '123456789012345678901234567890'],
    ['e0603b59-2edc-45f7-acc7-b0cccd6656e1', 'e0603b592edc45f7acc7b0cccd6656e1'],
    ['e0603b59-2edc-45f7-acc7-b0cccd6656e1', 'E0603B592EDC45F7ACC7B0CCCD6656E1']
  ])('should return %o given %j', (expected, str) => {
    expect(utils.addDashesToUuid(str)).toEqual(expected);
  });
});

// TODO: Deprecated, to remove this
describe('getPath', () => {
  const delimitSpy = jest.spyOn(utils, 'delimit');
  const joinPath = jest.spyOn(utils, 'joinPath');
  const getBucketKey = jest.spyOn(objectService, 'getBucketKey');

  const key = 'abc';
  const osKey = 'key';
  const value = 'abc/obj';

  it('should return a valid path', async () => {
    delimitSpy.mockReturnValue('wrong');
    joinPath.mockReturnValue(value);
    getBucketKey.mockResolvedValue({ key: key });
    config.get.mockReturnValueOnce(osKey); // objectStorage.key

    const result = await utils.getPath('obj');

    expect(result).toEqual(value);

    expect(delimitSpy).toHaveBeenCalledTimes(1);
    expect(delimitSpy).toHaveBeenCalledWith(osKey);
    expect(joinPath).toHaveBeenCalledTimes(1);
    expect(joinPath).toHaveBeenCalledWith(key, 'obj');
    expect(getBucketKey).toHaveBeenCalledTimes(1);
    expect(getBucketKey).toHaveBeenCalledWith('obj');
  });

  it('should return a valid path', async () => {
    delimitSpy.mockReturnValue(key);
    joinPath.mockReturnValue(value);
    getBucketKey.mockImplementation(() => { throw new Error(); });
    config.get.mockReturnValueOnce(osKey); // objectStorage.key

    const result = await utils.getPath('obj');

    expect(result).toEqual(value);

    expect(delimitSpy).toHaveBeenCalledTimes(1);
    expect(delimitSpy).toHaveBeenCalledWith(osKey);
    expect(joinPath).toHaveBeenCalledTimes(1);
    expect(joinPath).toHaveBeenCalledWith(key, 'obj');
    expect(getBucketKey).toHaveBeenCalledTimes(1);
    expect(getBucketKey).toHaveBeenCalledWith('obj');
  });
});

describe('delimit', () => {
  beforeAll(() => {
    if (jest.isMockFunction(utils.delimit)) {
      utils.delimit.mockRestore();
    }
  });

  it.each([
    // Should return empty string if falsy input
    ['', undefined],
    ['', null],
    ['', ''],
    // Strings with trailing delimiters should remain unchanged
    ['1234/', '1234/'],
    ['/', '/'],
    // Strings without trailing delimiters should have delimiter appended
    ['1234/', '1234'],
    ['    /', '    ']
  ])('should return %o given %j', (expected, str) => {
    expect(utils.delimit(str)).toEqual(expected);
  });
});

describe('getAppAuthMode', () => {
  it.each([
    [AuthMode.NOAUTH, false, false],
    [AuthMode.BASICAUTH, true, false],
    [AuthMode.OIDCAUTH, false, true],
    [AuthMode.FULLAUTH, true, true]
  ])('should return %s when basicAuth.enabled %s and keycloak.enabled %s', (expected, basicAuth, keycloak) => {
    config.has
      .mockReturnValueOnce(basicAuth) // basicAuth.enabled
      .mockReturnValueOnce(keycloak); // keycloak.enabled

    const result = utils.getAppAuthMode();

    expect(result).toEqual(expected);
    expect(config.has).toHaveBeenCalledTimes(2);
  });
});

describe('getBucket', () => {
  const cdata = {
    accessKeyId: 'accessKeyId',
    bucket: 'bucket',
    endpoint: 'https://endpoint.com',
    key: 'filePath',
    region: DEFAULTREGION,
    secretAccessKey: 'secretAccessKey'
  };
  const ddata = {
    accessKeyId: 'foo',
    bucket: 'bar',
    endpoint: 'https://baz.com',
    key: 'koo',
    region: DEFAULTREGION,
    secretAccessKey: 'soo'
  };
  const readBucketSpy = jest.spyOn(bucketService, 'read');

  beforeEach(() => {
    config.get
      .mockReturnValueOnce(cdata.accessKeyId) // objectStorage.accessKeyId
      .mockReturnValueOnce(cdata.bucket) // objectStorage.bucket
      .mockReturnValueOnce(cdata.endpoint) // objectStorage.endpoint
      .mockReturnValueOnce(cdata.key) // objectStorage.key
      .mockReturnValueOnce(cdata.secretAccessKey); // objectStorage.secretAccessKey
  });

  it('should return config data given no bucketId and not throwable', async () => {

    const result = await utils.getBucket();

    expect(result).toBeTruthy();
    expect(result).toEqual(cdata);
    expect(result).toHaveProperty('accessKeyId', cdata.accessKeyId);
    expect(result).toHaveProperty('bucket', cdata.bucket);
    expect(result).toHaveProperty('endpoint', cdata.endpoint);
    expect(result).toHaveProperty('key', cdata.key);
    expect(result).toHaveProperty('region', cdata.region);
    expect(result).toHaveProperty('secretAccessKey', cdata.secretAccessKey);
    expect(readBucketSpy).toHaveBeenCalledTimes(0);
  });

  it('should return config data given no bucketId and is throwable', async () => {

    const result = await utils.getBucket(undefined, true);

    expect(result).toBeTruthy();
    expect(result).toEqual(cdata);
    expect(result).toHaveProperty('accessKeyId', cdata.accessKeyId);
    expect(result).toHaveProperty('bucket', cdata.bucket);
    expect(result).toHaveProperty('endpoint', cdata.endpoint);
    expect(result).toHaveProperty('key', cdata.key);
    expect(result).toHaveProperty('region', cdata.region);
    expect(result).toHaveProperty('secretAccessKey', cdata.secretAccessKey);
    expect(readBucketSpy).toHaveBeenCalledTimes(0);
  });

  it('should return database data given a good bucketId and not throwable', async () => {
    readBucketSpy.mockResolvedValue(ddata);

    const result = await utils.getBucket('bucketId');

    expect(result).toBeTruthy();
    expect(result).toEqual(ddata);
    expect(result).toHaveProperty('bucket', ddata.bucket);
    expect(result).toHaveProperty('endpoint', ddata.endpoint);
    expect(result).toHaveProperty('key', ddata.key);
    expect(result).toHaveProperty('region', ddata.region);
    expect(result).toHaveProperty('secretAccessKey', ddata.secretAccessKey);
    expect(readBucketSpy).toHaveBeenCalledTimes(1);
    expect(readBucketSpy).toHaveBeenCalledWith('bucketId');
  });

  it('should return config data given a bad bucketId and not throwable', async () => {
    readBucketSpy.mockImplementation(() => { throw new Problem(422); });

    const result = await (() => utils.getBucket('bucketId'))();

    expect(result).toBeTruthy();
    expect(result).toEqual(cdata);
    expect(result).toHaveProperty('accessKeyId', cdata.accessKeyId);
    expect(result).toHaveProperty('bucket', cdata.bucket);
    expect(result).toHaveProperty('endpoint', cdata.endpoint);
    expect(result).toHaveProperty('key', cdata.key);
    expect(result).toHaveProperty('region', cdata.region);
    expect(result).toHaveProperty('secretAccessKey', cdata.secretAccessKey);
    expect(readBucketSpy).toHaveBeenCalledTimes(1);
    expect(readBucketSpy).toHaveBeenCalledWith('bucketId');
  });

  it('should throw given a bucketId and is throwable', () => {
    readBucketSpy.mockImplementation(() => { throw new Problem(422); });

    const result = (() => utils.getBucket('bucketId', true))();

    expect(result).rejects.toThrow();
    expect(readBucketSpy).toHaveBeenCalledTimes(1);
    expect(readBucketSpy).toHaveBeenCalledWith('bucketId');
  });
});

describe('getCurrentIdentity', () => {
  const getCurrentTokenClaimSpy = jest.spyOn(utils, 'getCurrentTokenClaim');
  const parseIdentityKeyClaimsSpy = jest.spyOn(utils, 'parseIdentityKeyClaims');

  const idirClaim = 'idir_user_guid';
  const subClaim = 'sub';

  beforeEach(() => {
    getCurrentTokenClaimSpy.mockReset().mockImplementation(() => { });
    parseIdentityKeyClaimsSpy.mockReset();
  });

  it.each([
    [undefined, [subClaim]],
    [undefined, [idirClaim, subClaim]],
    [null, [subClaim]],
    [null, [idirClaim, subClaim]],
    ['', [subClaim]],
    ['', [idirClaim, subClaim]],
    [[], [subClaim]],
    [[], [idirClaim, subClaim]],
    [{}, [subClaim]],
    [{}, [idirClaim, subClaim]]
  ])('should call functions correctly given %j', (currentUser, idKeys) => {
    parseIdentityKeyClaimsSpy.mockReturnValue(idKeys);

    utils.getCurrentIdentity(currentUser);

    expect(getCurrentTokenClaimSpy).toHaveBeenCalledTimes(idKeys.length);
    if (idKeys.length > 1) expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, idirClaim, undefined);
    expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, subClaim, undefined);
    expect(parseIdentityKeyClaimsSpy).toHaveBeenCalledTimes(1);
    expect(parseIdentityKeyClaimsSpy).toHaveBeenCalledWith();
  });

  it.each([
    [undefined, [subClaim]],
    [undefined, [idirClaim, subClaim]],
    [null, [subClaim]],
    [null, [idirClaim, subClaim]],
    ['', [subClaim]],
    ['', [idirClaim, subClaim]],
    [[], [subClaim]],
    [[], [idirClaim, subClaim]],
    [{}, [subClaim]],
    [{}, [idirClaim, subClaim]]
  ])('should call functions correctly given %j and defaultValue \'default\'', (currentUser, idKeys) => {
    const defaultValue = 'default';
    parseIdentityKeyClaimsSpy.mockReturnValue(idKeys);

    utils.getCurrentIdentity(currentUser, defaultValue);

    expect(getCurrentTokenClaimSpy).toHaveBeenCalledTimes(idKeys.length);
    if (idKeys.length > 1) expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, idirClaim, undefined);
    expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, subClaim, undefined);
    expect(parseIdentityKeyClaimsSpy).toHaveBeenCalledTimes(1);
    expect(parseIdentityKeyClaimsSpy).toHaveBeenCalledWith();
  });
});

describe('getCurrentSubject', () => {
  const getCurrentTokenClaimSpy = jest.spyOn(utils, 'getCurrentTokenClaim');

  beforeEach(() => {
    getCurrentTokenClaimSpy.mockReset().mockImplementation(() => { });
  });

  it.each([undefined, null, '', [], {}])('should call getCurrentTokenClaim correctly given %j', (currentUser) => {
    utils.getCurrentSubject(currentUser);

    expect(getCurrentTokenClaimSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, 'sub', undefined);
  });

  it.each([undefined, null, '', [], {}])('should call getCurrentTokenClaim correctly given %j and defaultValue \'default\'', (currentUser) => {
    const defaultValue = 'default';
    utils.getCurrentSubject(currentUser, defaultValue);

    expect(getCurrentTokenClaimSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, 'sub', defaultValue);
  });
});

describe('getCurrentTokenClaim', () => {
  const defaultValue = 'default';

  beforeAll(() => {
    if (jest.isMockFunction(utils.getCurrentTokenClaim)) {
      utils.getCurrentTokenClaim.mockRestore();
    }
  });

  it.each([
    // Should return defaultValue if no currentUser
    [undefined, undefined, undefined],
    [undefined, undefined, 'bad'],
    [undefined, undefined, 'sub'],
    [undefined, null, undefined],
    [undefined, null, 'bad'],
    [undefined, null, 'sub'],
    // Should return defaultValue if invalid currentUser
    [undefined, '', undefined],
    [undefined, '', 'bad'],
    [undefined, '', 'sub'],
    [undefined, {}, undefined],
    [undefined, {}, 'bad'],
    [undefined, {}, 'sub'],
    [undefined, { a: 1 }, undefined],
    [undefined, { a: 1 }, 'bad'],
    [undefined, { a: 1 }, 'sub'],
    // Should return defaultValue if not authType Bearer
    [undefined, { authType: AuthType.BASIC }, undefined],
    [undefined, { authType: AuthType.BASIC }, 'bad'],
    [undefined, { authType: AuthType.BASIC }, 'sub'],
    // Should return claim value if authType Bearer
    [undefined, { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, undefined],
    [undefined, { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, 'bad'],
    ['foo', { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, 'sub'],
  ])('should return %j given currentUser %j and claim %j', (expected, currentUser, claim) => {
    expect(utils.getCurrentTokenClaim(currentUser, claim)).toBe(expected);
  });

  it.each([
    // Should return defaultValue if no currentUser
    [defaultValue, undefined, undefined],
    [defaultValue, undefined, 'bad'],
    [defaultValue, undefined, 'sub'],
    [defaultValue, null, undefined],
    [defaultValue, null, 'bad'],
    [defaultValue, null, 'sub'],
    // Should return defaultValue if invalid currentUser
    [defaultValue, '', undefined],
    [defaultValue, '', 'bad'],
    [defaultValue, '', 'sub'],
    [defaultValue, {}, undefined],
    [defaultValue, {}, 'bad'],
    [defaultValue, {}, 'sub'],
    [defaultValue, { a: 1 }, undefined],
    [defaultValue, { a: 1 }, 'bad'],
    [defaultValue, { a: 1 }, 'sub'],
    // Should return defaultValue if not authType Bearer
    [defaultValue, { authType: AuthType.BASIC }, undefined],
    [defaultValue, { authType: AuthType.BASIC }, 'bad'],
    [defaultValue, { authType: AuthType.BASIC }, 'sub'],
    // Should return claim value if authType Bearer
    [undefined, { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, undefined],
    [undefined, { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, 'bad'],
    ['foo', { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, 'sub'],
  ])('should return %j given currentUser %j, claim %j and defaultValue \'default\'', (expected, currentUser, claim) => {
    expect(utils.getCurrentTokenClaim(currentUser, claim, defaultValue)).toBe(expected);
  });
});

describe('getGitRevision', () => {
  expect(typeof utils.getGitRevision()).toBe('string');
});

describe('getKeyValue', () => {
  it.each([
    [[], null],
    [[], undefined],
    [[], []],
    [[], {}],
    [[{ key: 'foo', value: 'bar' }], { foo: 'bar' }],
    [[{ key: 'k1', value: 'v1' }, { key: 'k2', value: 'v2' }], { k1: 'v1', k2: 'v2' }],
  ])('should yield %j when given %j', (expected, input) => {
    expect(utils.getKeyValue(input)).toEqual(expected);
  });
});

describe('getMetadata', () => {
  it.each([
    [undefined, {}],
    [undefined, { 'Content-Length': 1234 }],
    [{ foo: 'bar' }, { 'Content-Length': 1234, 'x-amz-meta-foo': 'bar' }],
    [{ foo: 'bar', baz: 'quz' }, { 'Content-Length': 1234, 'x-amz-meta-foo': 'bar', 'x-amz-meta-baz': 'quz' }],
    [{ bam: 'blam', run: 'ran' }, { 'Content-Length': 1234, 'X-Amz-Meta-Bam': 'blam', 'x-AmZ-mEtA-rUn': 'ran' }],
  ])('should yield %j when given %j', (expected, input) => {
    expect(utils.getMetadata(input)).toEqual(expected);
  });
});

describe('getObjectsByKeyValue', () => {
  it.each([
    [undefined, [], undefined, undefined],
    [undefined, [], 'foo', 'bar'],
    [{ key: 'a', value: '1' }, [{ key: 'a', value: '1' }, { key: 'b', value: '1' }], 'a', '1'],
    [{ key: 'b', value: '1' }, [{ key: 'a', value: '1' }, { key: 'b', value: '1' }], 'b', '1'],
  ])('should yield %j when given array %j, key %s and value %s', (expected, array, key, value) => {
    expect(utils.getObjectsByKeyValue(array, key, value)).toEqual(expected);
  });
});

describe('groupByObject', () => {
  const test1 = { foo: 'baz', blah: 'test' };
  const test2 = { foo: 'baz', blah: 'test2' };
  const test3 = { foo: 'free', blah: 'test3' };

  it.each([
    [[], 'foo', 'bar', []],
    [[{ foo: 'baz', bar: [test1] }], 'foo', 'bar', [test1]],
    [[{ foo: 'baz', bar: [test1, test2] }], 'foo', 'bar', [test1, test2]],
    [[{ foo: 'baz', bar: [test1, test2] }, { foo: 'free', bar: [test3] }], 'foo', 'bar', [test1, test2, test3]]
  ])('should return %j given property %s, group %s and objectArray %j', (expected, property, group, objectArray) => {
    expect(utils.groupByObject(property, group, objectArray)).toEqual(expected);
  });
});

describe('isAtPath', () => {
  it.each([
    [false, undefined, undefined],
    [false, null, null],
    [false, '', ''],
    [true, '/', 'file'],
    [false, '/', 'file/bleep'],
    [true, 'foo', 'foo/bar'],
    [true, 'foo', '/foo/bar'],
    [true, '/foo', 'foo/bar'],
    [true, '/foo', '/foo/bar'],
    [true, 'a/b', 'a/b/foo.jpg'],
    [false, 'a/b', 'a/b/z/deep.jpg'],
    [false, 'a/b', 'a/b/y/z/deep.jpg'],
    [false, 'a/b/c', 'a/bar.png'],
    [false, 'c/b/a', 'a/b/c/bar.png'],
    [false, 'c/a/b', 'a/b/c/bar.png'],
    [false, 'a/b/c', 'a/c/b/bar.png'],
    [true, 'a/b/c', 'a/b/c/bar.png'],
  ])('should return %j given prefix %j and path %j', (expected, prefix, path) => {
    expect(utils.isAtPath(prefix, path)).toEqual(expected);
  });
});

describe('isTruthy', () => {
  it('should return undefined given undefined', () => {
    expect(utils.isTruthy(undefined)).toBeUndefined();
  });

  it.each([
    true, 1, 'true', 'TRUE', 't', 'T', 'yes', 'yEs', 'y', 'Y', '1', new String('true')
  ])('should return true given %j', (value) => {
    expect(utils.isTruthy(value)).toBeTruthy();
  });

  it.each([
    false, 0, 'false', 'FALSE', 'f', 'F', 'no', 'nO', 'n', 'N', '0', new String('false'), {}
  ])('should return false given %j', (value) => {
    expect(utils.isTruthy(value)).toBeFalsy();
  });
});

describe('joinPath', () => {
  beforeAll(() => {
    if (jest.isMockFunction(utils.joinPath)) {
      utils.joinPath.mockRestore();
    }
  });

  it('should return blank if nothing supplied', () => {
    expect(utils.joinPath()).toEqual('');
  });

  it('should return multiple parts joined with the delimiter', () => {
    expect(utils.joinPath('my', 'file', 'path')).toEqual('my/file/path');
    expect(utils.joinPath('my', '', 'path')).toEqual('my/path');
    expect(utils.joinPath('my', 'file/path/123', 'abc')).toEqual('my/file/path/123/abc');
  });

  it('should handle no-length sections', () => {
    expect(utils.joinPath('my', 'file//123', 'abc')).toEqual('my/file/123/abc');
  });
});

describe('mixedQueryToArray', () => {
  it('should return undefined if no param', () => {
    expect(utils.mixedQueryToArray()).toBeUndefined();
    expect(utils.mixedQueryToArray(null)).toBeUndefined();
    expect(utils.mixedQueryToArray(undefined)).toBeUndefined();
    expect(utils.mixedQueryToArray('')).toBeUndefined();
    expect(utils.mixedQueryToArray(false)).toBeUndefined();
  });

  it('should return the undefined for an empty array', () => {
    expect(utils.mixedQueryToArray([])).toBeUndefined();
  });

  it('should return a one item array for a single string', () => {
    expect(utils.mixedQueryToArray('word')).toEqual(['word']);
    expect(utils.mixedQueryToArray('more than than one word word')).toEqual(['more than than one word word']);
    expect(utils.mixedQueryToArray(['word'])).toEqual(['word']);
  });

  it('should return an array with the appropriate set when there are multiples', () => {
    expect(utils.mixedQueryToArray('there,are,duplicates,here,yes,here,there,is,here')).toEqual(['there', 'are', 'duplicates', 'here', 'yes', 'is']);
  });

  it('should return an array with the appropriate set when there are multiples and spaces', () => {
    expect(utils.mixedQueryToArray('there,  are, duplicates,  here ,yes ,here ,there,is,here ')).toEqual(['there', 'are', 'duplicates', 'here', 'yes', 'is']);
  });

  it('should return an array with the appropriate set when there are multiples and spaces', () => {
    expect(utils.mixedQueryToArray(['there', '  are', ' duplicates', '  here ', 'yes ', 'here ', 'there', 'is', 'here '])).toEqual(['there', 'are', 'duplicates', 'here', 'yes', 'is']);
  });
});

describe('parseCSV', () => {
  it.each([
    // Should return back input if not a string
    [undefined, undefined],
    [12, 12],
    [null, null],
    [['a', 'b'], ['a', 'b']],
    [{ a: 'a', b: 'b' }, { a: 'a', b: 'b' }],
    // Should return an array of split trimmed strings for blanks
    [[''], ''],
    [['', ''], '   ,   '],
    // Should return an array of split trimmed strings
    [['this', 'is', 'a', 'test'], 'this, is , a,test  ']
  ])('should return %j given %j', (expected, value) => {
    expect(utils.parseCSV(value)).toEqual(expected);
  });
});

describe('parseIdentityKeyClaims', () => {
  beforeAll(() => {
    if (jest.isMockFunction(utils.parseIdentityKeyClaims)) {
      utils.parseIdentityKeyClaims.mockRestore();
    }
  });

  it('should return array containing just "sub" when no identityKey', () => {
    config.has.mockReturnValueOnce(false); // keycloak.identityKey
    expect(utils.parseIdentityKeyClaims()).toEqual(['sub']);
  });

  it.each([
    [['foo', 'sub'], 'foo'],
    [['foo', 'bar', 'sub'], 'foo,bar']
  ])('should return %j when identityKey is %j', (expected, value) => {
    config.has.mockReturnValueOnce(true); // keycloak.identityKey
    config.get.mockReturnValueOnce(value); // keycloak.identityKey
    expect(utils.parseIdentityKeyClaims()).toEqual(expected);
  });
});

describe('streamToBuffer', () => {
  it('should reject on a non-stream input', () => {
    expect(utils.streamToBuffer()).rejects.toThrow();
    expect(utils.streamToBuffer(123)).rejects.toThrow();
  });

  it('should return a buffer', () => {
    const Readable = require('stream').Readable;
    const s = new Readable();
    s._read = () => { }; // redundant? see update below
    s.push('your text here');
    s.push(null);

    const result = utils.streamToBuffer(s);

    expect(result).resolves.toBeTruthy();
    expect(result).resolves.toBeInstanceOf(Buffer);
  });
});

describe('stripDelimit', () => {
  it.each([
    // Should return empty string if falsy input
    ['', undefined],
    ['', null],
    ['', ''],
    // Strings without trailing delimiters should remain unchanged
    ['1234', '1234'],
    ['foo', 'foo'],
    ['bar\\', 'bar\\'],
    // Strings with trailing delimiters should have the delimiter removed
    ['1234', '1234/'],
    ['    ', '    /'],
    ['', '/'],
    ['', '//'],
  ])('should return %o given %j', (expected, str) => {
    expect(utils.stripDelimit(str)).toEqual(expected);
  });
});

describe('toLowerKeys', () => {
  it.each([
    [undefined, undefined],
    [undefined, 1],
    [undefined, {}],
    [[{ key: 'k1', value: 'V1' }], [{ Key: 'k1', Value: 'V1' }]],
    [[{ key: 'k1', value: 'V1' }, { key: 'k2', value: 'V2' }], [{ Key: 'k1', Value: 'V1' }, { Key: 'k2', Value: 'V2' }]]
  ])('should return %j given %j', (expected, value) => {
    expect(utils.toLowerKeys(value)).toEqual(expected);
  });
});
