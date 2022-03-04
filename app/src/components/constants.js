module.exports = Object.freeze({
  /** Application authentication mode */
  AuthMode: {
    /** Only Basic Authentication */
    BASICAUTH: 'BASICAUTH',
    /** Both Basic and OIDC Authentication */
    FULLAUTH: 'FULLAUTH',
    /** Public mode */
    NOAUTH: 'NOAUTH',
    /** Only OIDC Authentication */
    OIDCAUTH: 'OIDCAUTH',
  },

  /** Current user authentication type */
  AuthType: {
    /** Basic Authentication credential header provided */
    BASIC: 'BASIC',
    /** OIDC JWT Authentication header provided */
    BEARER: 'BEARER',
    /** No Authentication header provided */
    NONE: 'NONE'
  },

  /** Object permissions */
  Permissions: {
    /** Grants object creation permission */
    CREATE: 'CREATE',
    /** Grants object read permission */
    READ: 'READ',
    /** Grants object update permission */
    UPDATE: 'UPDATE',
    /** Grants object deletion permission */
    DELETE: 'DELETE',
    /** Grants object permission management */
    MANAGE: 'MANAGE'
  },
});
