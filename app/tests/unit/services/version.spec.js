const { resetReturnThis } = require('../../common/helper');
const Version = require('../../../src/db/models/tables/version');

jest.mock('../../../src/db/models/tables/version', () => ({
  commit: jest.fn().mockReturnThis(),
  rollback: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  orderBy: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis()
}));

const service = require('../../../src/services/version');

beforeEach(() => {
  jest.clearAllMocks();
  resetReturnThis(Version);
});

describe('list', () => {
  it('Query versions by objectId', async () => {
    await service.list('abc');

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledWith({ objectId: 'abc' });
    expect(Version.orderBy).toHaveBeenCalledWith('createdAt', 'DESC');
  });
});
