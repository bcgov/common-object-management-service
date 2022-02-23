const Problem = require('api-problem');

const { basicAuthConfig, spkiWrapper } = require('../../../src/middleware/authentication');

describe('basicAuthConfig authorizer', () => {
  // Username and PW set in test env config
  it('returns true if user and PW match', () => {
    expect(basicAuthConfig.authorizer('username0', 'password1')).toBeTruthy();
  });
  it('returns false if user and PW do not match', () => {
    expect(basicAuthConfig.authorizer('username456', 'password1')).toBeFalsy();
    expect(basicAuthConfig.authorizer('username0', 'password456')).toBeFalsy();
    expect(basicAuthConfig.authorizer('something', 'notright')).toBeFalsy();
  });
});

describe('basicAuthConfig unauthorizedResponse', () => {
  it('returns a problem', () => {
    const result = basicAuthConfig.unauthorizedResponse();
    expect(result).toBeTruthy();
    expect(result).toBeInstanceOf(Problem);
    expect(result.status).toEqual(401);
  });
});

describe('spkiWrapper', () => {
  it('returns the PEM format we expect', () => {
    const spki = `MIIB9TCCAWACAQAwgbgxGTAXBgNVBAoMEFF1b1ZhZGlzIExpbWl0ZWQxHDAaBgNV
    BAsME0RvY3VtZW50IERlcGFydG1lbnQxOTA3BgNVBAMMMFdoeSBhcmUgeW91IGRl
    Y29kaW5nIG1lPyAgVGhpcyBpcyBvbmx5IGEgdGVzdCEhITERMA8GA1UEBwwISGFt
    aWx0b24xETAPBgNVBAgMCFBlbWJyb2tlMQswCQYDVQQGEwJCTTEPMA0GCSqGSIb3
    DQEJARYAMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCJ9WRanG/fUvcfKiGl
    EL4aRLjGt537mZ28UU9/3eiJeJznNSOuNLnF+hmabAu7H0LT4K7EdqfF+XUZW/2j
    RKRYcvOUDGF9A7OjW7UfKk1In3+6QDCi7X34RE161jqoaJjrm/T18TOKcgkkhRzE
    apQnIDm0Ea/HVzX/PiSOGuertwIDAQABMAsGCSqGSIb3DQEBBQOBgQBzMJdAV4QP
    Awel8LzGx5uMOshezF/KfP67wJ93UW+N7zXY6AwPgoLj4Kjw+WtU684JL8Dtr9FX
    ozakE+8p06BpxegR4BR3FMHf6p+0jQxUEAkAyb/mVgm66TyghDGC6/YkiKoZptXQ
    98TwDIK/39WEB/V607As+KoYazQG8drorw==
    `;
    expect(spkiWrapper(spki)).toEqual(`-----BEGIN PUBLIC KEY-----\n${spki}\n-----END PUBLIC KEY-----`);
  });
});
