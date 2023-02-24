const { MockModel, MockTransaction } = require('../../common/dbHelper');

jest.mock('../../../src/db/models/tables/version', () => MockModel);

const service = require('../../../src/services/version');

beforeEach(() => {
  MockModel.mockReset();
  MockTransaction.mockReset();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('list', () => {

  it('Query versions by objectId', async () => {

    await service.list('abc');

    expect(MockModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
    expect(MockModel.where).toHaveBeenCalledWith({ objectId: 'abc' });
    expect(MockModel.orderBy).toHaveBeenCalledWith('createdAt', 'DESC');
  });
});
