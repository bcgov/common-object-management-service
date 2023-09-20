const {
  filterOneOrMany,
  filterILike,
  inArrayClause,
  inArrayFilter,
  redactSecrets,
  toArray
} = require('../../../../src/db/models/utils');

describe('filterOneOrMany', () => {
  it('should do nothing if there is no value specified', () => {
    const where = jest.fn();
    const whereIn = jest.fn();

    filterOneOrMany({ where: where, whereIn: whereIn }, undefined, 'column');

    expect(where).toHaveBeenCalledTimes(0);
    expect(whereIn).toHaveBeenCalledTimes(0);
  });

  it('should do a wherein query if value is a non-empty string array', () => {
    const where = jest.fn();
    const whereIn = jest.fn();

    filterOneOrMany({ where: where, whereIn: whereIn }, ['foo'], 'column');

    expect(where).toHaveBeenCalledTimes(0);
    expect(whereIn).toHaveBeenCalledTimes(1);
    expect(whereIn).toHaveBeenCalledWith('column', ['foo']);
  });

  it('should do a where query if value is a string', () => {
    const where = jest.fn();
    const whereIn = jest.fn();

    filterOneOrMany({ where: where, whereIn: whereIn }, 'foo', 'column');

    expect(where).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledWith('column', 'foo');
    expect(whereIn).toHaveBeenCalledTimes(0);
  });
});

describe('filterILike', () => {
  it('should perform an ilike search on the specified column if there is a value', () => {
    const where = jest.fn();

    filterILike({ where: where }, 'value', 'column');

    expect(where).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledWith('column', 'ilike', '%value%');
  });

  it('should do nothing if there is no value specified', () => {
    const where = jest.fn();

    filterILike({ where: where }, undefined, 'column');

    expect(where).toHaveBeenCalledTimes(0);
  });
});

describe('inArrayClause', () => {
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

describe('inArrayFilter', () => {
  it('should return the desired clause for multiple values joined with OR', () => {
    const col = 'user';
    const vals = ['1', '2', '3'];
    expect(inArrayFilter(col, vals)).toEqual('(array_length("user", 1) > 0 and (\'1\' = ANY("user") or \'2\' = ANY("user") or \'3\' = ANY("user")))');
  });
});

describe('redactSecrets', () => {
  const data = {
    foo: 'foo',
    bar: 'bar',
    baz: 'baz'
  };

  it('should do nothing if fields is undefined', () => {
    expect(redactSecrets(data, undefined)).toEqual(expect.objectContaining(data));
  });

  it('should do nothing if fields is empty array', () => {
    expect(redactSecrets(data, [])).toEqual(expect.objectContaining(data));
  });

  it('should redact the specified fields if they exist', () => {
    expect(redactSecrets(data, ['bar', 'garbage']))
      .toEqual(expect.objectContaining({ ...data, bar: 'REDACTED' }));
  });
});

describe('toArray', () => {
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
