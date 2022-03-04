const { requireDb } = require('../../../src/middleware/featureToggle');

const testRes = {
  writeHead: jest.fn(),
  end: jest.fn()
};

afterEach(() => {
  jest.clearAllMocks();
});

describe.skip('requireDb', () => {
  it('calls next if database is enabled', async () => {
    const nxt = jest.fn();
    const req = { a: '1' };

    await requireDb(req, testRes, nxt);
    expect(nxt).toHaveBeenCalledTimes(1);
  });

  it('501s if the database is disabled', async () => {
    const nxt = jest.fn();
    const req = { a: '1' };

    const result = await requireDb(req, testRes, nxt);
    expect(nxt).toHaveBeenCalledTimes(0);
    expect(result.status).toEqual(501);
  });
});
