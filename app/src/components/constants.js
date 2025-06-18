module.exports = Object.freeze({
  /** S3 All Users Predefined group URI */
  ALLUSERS: 'http://acs.amazonaws.com/groups/global/AllUsers',

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

  /**
   * In COMS 'strict mode', users specific with token idp's (eg: idir)
   * are given additional permissions.
  */
  ElevatedIdps: [
    'idir'
  ],

  /** Default CORS settings used across the entire application */
  DEFAULTCORS: {
    /** Tells browsers to cache preflight requests for Access-Control-Max-Age seconds */
    maxAge: 600,
    /** Set true to dynamically set Access-Control-Allow-Origin based on Origin */
    origin: true,
    /** Configures the Access-Control-Expose-Headers CORS header */
    exposedHeaders: 'X-Total-Rows',
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

  /** Maximum object key length supported by S3 */
  MAXOBJECTKEYLENGTH: 1024, // 1024 B

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
  },

  /** Only permissions allowed for bucket invite */
  InviteBucketAllowedPermissions: {
    /** Grants resource creation permission */
    CREATE: 'CREATE',
    // /** Grants resource read permission */
    READ: 'READ',
    /** Grants resource update permission */
    UPDATE: 'UPDATE',
  },

  /** Only permissions allowed for object invite */
  InviteObjectAllowedPermissions: {
    /** Grants resource creation permission */
    CREATE: 'UPDATE',
    /** Grants resource read permission */
    READ: 'READ',
  },

  /** Resource types */
  ResourceType: {
    /** Bucket Type */
    BUCKET: 'bucketId',
    /** Object Type */
    OBJECT: 'objectId'
  },

  /** Sort Order */
  SortOrder: {
    ASC: 'asc',
    DESC: 'desc'
  }
});
