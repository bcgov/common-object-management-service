const { toArray, inArrayClause, inArrayFilter, tableNames } = require('../../../../src/db/models/utils');

describe('Test Model Utils toArray function', () => {

  it('should return blank array if nothing specified', () => {
    expect(toArray()).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
    expect(toArray(null)).toEqual([]);
    expect(toArray(false)).toEqual([]);
  });

  it('should return an array if one is specified', () => {
    const arr = ['1', '2', '3'];
    expect(toArray(arr)).toEqual(arr);
  });

  it('should return an array with trimmed blank values', () => {
    const arr = ['1', '', '3', '   ', '4'];
    expect(toArray(arr)).toEqual(['1', '3', '4']);
  });

  it('should convert to an array', () => {
    expect(toArray('hello')).toEqual(['hello']);
  });

});

describe('Test Model Utils inArrayClause function', () => {
  it('should return the desired clause for a single values', () => {
    const col = 'user';
    const vals = ['1'];
    expect(inArrayClause(col, vals)).toEqual('\'1\' = ANY("user")');
  });

  it('should return the desired clause for multiple values joined with OR', () => {
    const col = 'user';
    const vals = ['1', '2', '3'];
    expect(inArrayClause(col, vals)).toEqual('\'1\' = ANY("user") or \'2\' = ANY("user") or \'3\' = ANY("user")');
  });

  it('should return a blank string for a blank array', () => {
    const col = 'user';
    const vals = [];
    expect(inArrayClause(col, vals)).toEqual('');
  });
});

describe('Test Model Utils inArrayFilter function', () => {
  it('should return the desired clause for multiple values joined with OR', () => {
    const col = 'user';
    const vals = ['1', '2', '3'];
    expect(inArrayFilter(col, vals)).toEqual('(array_length("user", 1) > 0 and (\'1\' = ANY("user") or \'2\' = ANY("user") or \'3\' = ANY("user")))');
  });
});

describe('Test Model Utils tableNames function', () => {
  it('should return the desired clause for multiple values joined with OR', () => {
    const models = {
      objectTable: {
        tableName: 'object'
      },
      permissionTable: {
        tableName: 'permission'
      },
      userTable: {
        tableName: 'user'
      }
    };
    expect(tableNames(models)).toEqual(['object', 'permission', 'user']);
  });
});
