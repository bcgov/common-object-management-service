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

  /** Maximum Content Length supported by S3 CopyObjectCommand */
  MAXCOPYOBJECTLENGTH: 5 * 1024 * 1024 * 1024,
  /** Default maximum number of keys to list. S3 default cap is 1000*/
  MAXKEYS: (2 ** 31) - 1,

  /** Allowable values for the Metadata Directive parameter */
  MetadataDirective: {
    /** The original metadata is copied to the new version as-is where applicable. */
    COPY: 'COPY',
    /** All original metadata is replaced by the metadata you specify. */
    REPLACE: 'REPLACE'
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
