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

  /** Default CORS settings used across the entire application */
  DEFAULTCORS: {
    /** Tells browsers to cache preflight requests for Access-Control-Max-Age seconds */
    maxAge: 600,
    /** Set true to dynamically set Access-Control-Allow-Origin based on Origin */
    origin: true
  },

  /** Need to specify valid AWS region or it'll explode ('us-east-1' is default, 'ca-central-1' for Canada) */
  DEFAULTREGION: 'us-east-1',

  /** Download mode behavior overrides */
  DownloadMode: {
    /** Proxies payload data through COMS */
    PROXY: 'proxy',
    /** Returns only a pre-signed S3 url */
    URL: 'url'
  },

  /**
   * Generic email regex modified to require domain of at least 2 characters
   * @see {@link https://emailregex.com/}
   */
  EMAILREGEX: '^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]{2,})+$',

  /** Maximum number of parts supported by lib-storage upload */
  MAXPARTCOUNT: 10000,

  /** Maximum Content Length supported by S3 CopyObjectCommand */
  MAXCOPYOBJECTLENGTH: 5 * 1024 * 1024 * 1024, // 5 GB

  /** Maximum Content Length supported by S3 CopyObjectCommand */
  MAXFILEOBJECTLENGTH: 5 * 1024 * 1024 * 1024 * 1024, // 5 TB

  /** Allowable values for the Metadata Directive parameter */
  MetadataDirective: {
    /** The original metadata is copied to the new version as-is where applicable. */
    COPY: 'COPY',
    /** All original metadata is replaced by the metadata you specify. */
    REPLACE: 'REPLACE'
  },

  /** Minimum part size supported by lib-storage upload */
  MINPARTSIZE: 5 * 1024 * 1024, // 5 MB

  /** Allowable values for the Tagging Directive parameter */
  TaggingDirective: {
    /** The original tags are copied to the new version as-is where applicable. */
    COPY: 'COPY',
    /** All original tags are replaced by the tags you specify. */
    REPLACE: 'REPLACE'
  },

  /** Resource permissions */
  Permissions: {
    /** Grants resource creation permission */
    CREATE: 'CREATE',
    /** Grants resource read permission */
    READ: 'READ',
    /** Grants resource update permission */
    UPDATE: 'UPDATE',
    /** Grants resource deletion permission */
    DELETE: 'DELETE',
    /** Grants resource permission management */
    MANAGE: 'MANAGE'
  }
});
