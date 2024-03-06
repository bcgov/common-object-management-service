const { NIL: RESOURCE, NIL: TOKEN, NIL: SYSTEM_USER } = require('uuid');

const { resetModel, trxBuilder } = require('../../common/helper');
const { ResourceType } = require('../../../src/components/constants');
const Invite = require('../../../src/db/models/tables/invite');

const inviteTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/invite', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  delete: jest.fn(),
  deleteById: jest.fn(),
  findById: jest.fn(),
  insert: jest.fn(),
  query: jest.fn(),
  returning: jest.fn(),
  throwIfNotFound: jest.fn(),
  where: jest.fn()
}));

const service = require('../../../src/services/invite');

const SYSTEM_TIME = new Date('2024-03-08T19:00:00.000Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(SYSTEM_TIME);
});

beforeEach(() => {
  jest.clearAllMocks();
  resetModel(Invite, inviteTrx);
});

afterAll(() => {
  jest.setSystemTime(jest.getRealSystemTime());
  jest.useRealTimers();
});

describe('create', () => {
  it('Creates an invitation record', async () => {
    const data = {
      token: TOKEN,
      email: 'foo@bar.baz',
      resource: RESOURCE,
      type: ResourceType.OBJECT,
      expiresAt: SYSTEM_TIME,
      createdBy: SYSTEM_USER
    };

    await service.create(data);

    expect(Invite.startTransaction).toHaveBeenCalledTimes(1);
    expect(Invite.query).toHaveBeenCalledTimes(1);
    expect(Invite.query).toHaveBeenCalledWith(expect.anything());
    expect(Invite.insert).toHaveBeenCalledTimes(1);
    expect(Invite.insert).toHaveBeenCalledWith(expect.objectContaining(data));
    expect(inviteTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('delete', () => {
  it('Deletes an invitation record', async () => {
    await service.delete(TOKEN);

    expect(Invite.startTransaction).toHaveBeenCalledTimes(1);
    expect(Invite.query).toHaveBeenCalledTimes(1);
    expect(Invite.query).toHaveBeenCalledWith(expect.anything());
    expect(Invite.deleteById).toHaveBeenCalledTimes(1);
    expect(Invite.deleteById).toHaveBeenCalledWith(TOKEN);
    expect(Invite.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(Invite.returning).toHaveBeenCalledTimes(1);
    expect(Invite.returning).toBeCalledWith('*');
    expect(inviteTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('prune', () => {
  it('Deletes all expired invitation records', async () => {
    await service.prune();

    expect(Invite.startTransaction).toHaveBeenCalledTimes(1);
    expect(Invite.query).toHaveBeenCalledTimes(1);
    expect(Invite.query).toHaveBeenCalledWith(expect.anything());
    expect(Invite.delete).toHaveBeenCalledTimes(1);
    expect(Invite.where).toHaveBeenCalledTimes(1);
    expect(Invite.where).toHaveBeenCalledWith('expiresAt', '<', SYSTEM_TIME.toISOString());
    expect(Invite.returning).toHaveBeenCalledTimes(1);
    expect(Invite.returning).toBeCalledWith('*');
    expect(inviteTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('read', () => {
  it('Returns an invitation record', async () => {
    await service.read(TOKEN);

    expect(Invite.startTransaction).toHaveBeenCalledTimes(1);
    expect(Invite.query).toHaveBeenCalledTimes(1);
    expect(Invite.query).toHaveBeenCalledWith(expect.anything());
    expect(Invite.findById).toHaveBeenCalledTimes(1);
    expect(Invite.findById).toHaveBeenCalledWith(TOKEN);
    expect(Invite.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(inviteTrx.commit).toHaveBeenCalledTimes(1);
  });
});
