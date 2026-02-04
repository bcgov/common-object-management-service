const {
  CopyObjectCommand,
  DeleteBucketPolicyCommand,
  DeleteObjectCommand,
  DeleteObjectTaggingCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetObjectAclCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutObjectAclCommand,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  PutBucketEncryptionCommand,
  PutObjectTaggingCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('config');

const { ALLUSERS, DEFAULTREGION, MetadataDirective, TaggingDirective } = require('../components/constants');
const log = require('../components/log')(module.filename);
const utils = require('../components/utils');

const DELIMITER = '/';

// Cache AWS S3Clients in order to reuse S3 connections
const s3ClientCache = new Map();

// Get app configuration
const defaultTempExpiresIn = parseInt(config.get('server.defaultTempExpiresIn'), 10);

/**
 * The Core S3 Object Storage Service
 * @see {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/}
 */
const objectStorageService = {
  /**
   * @private
   * @function _getS3Client
   * The AWS S3Client used for interacting with S3 compatible storage
   * @param {string} options.accessKeyId The S3 Bucket accessKeyId
   * @param {string} options.endpoint The S3 Bucket endpoint
   * @param {string} options.region The S3 Bucket region
   * @param {string} options.secretAccessKey The S3 Bucket secretAccessKey
   * @param {Readable} stream A readable stream object
   * @returns {object} A pre-configured S3 Client object
   */
  _getS3Client: ({ accessKeyId, endpoint, region, secretAccessKey } = {}) => {
    if (!accessKeyId || !endpoint || !region || !secretAccessKey) {
      log.error('Unable to generate S3Client due to missing arguments', { function: '_getS3Client' });
    }

    // S3Client already exists for the given credentials
    const cacheKey = JSON.stringify([accessKeyId, endpoint, region]);
    if (s3ClientCache.has(cacheKey)) {
      return s3ClientCache.get(cacheKey);
    }

    // If new, cache the S3Client before returning
    const newClient = new S3Client({
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      },
      endpoint: endpoint,
      forcePathStyle: true,
      logger: ['silly', 'debug'].includes(config.get('server.logLevel')) ? log : undefined,
      retryMode: 'standard',
      requestHandler: {
        connectionTimeout: 5000,
        requestTimeout: 60000,
        httpsAgent: {
          keepAlive: true,
          keepAliveMsecs: 5000,
          maxSockets: 15,
          maxFreeSockets: 10,
          timeout: 30000
        }
      },
      region: region
    });
    s3ClientCache.set(cacheKey, newClient);
    return newClient;
  },

  /**
   * @function copyObject
   * Creates a copy of the object at `copySource` for the same bucket
   * @param {string} options.copySource Specifies the source object for the copy operation, excluding the bucket name
   * @param {string} options.filePath The filePath of the object
   * @param {object} [options.metadata] Optional metadata to store with the object
   * @param {object} [options.tags] Optional tags to store with the object
   * @param {string} [options.metadataDirective=COPY] Optional metadata operation directive
   * @param {string} [options.taggingDirective=COPY] Optional tagging operation directive
   * @param {string} [options.s3VersionId] Optional s3VersionId to copy from
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the copy object operation
   */
  async copyObject({
    copySource,
    filePath,
    metadata,
    tags,
    metadataDirective = MetadataDirective.COPY,
    taggingDirective = TaggingDirective.COPY,
    s3VersionId = undefined,
    bucketId = undefined
  }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      CopySource: `${data.bucket}/${copySource}?versionId=${s3VersionId}`,
      Key: filePath,
      Metadata: metadata,
      MetadataDirective: metadataDirective,
      TaggingDirective: taggingDirective,
    };

    if (tags) {
      params.Tagging = Object.entries(tags).map(([key, value]) => {
        return `${key}=${encodeURIComponent(value)}`;
      }).join('&');
    }

    return this._getS3Client(data).send(new CopyObjectCommand(params));
  },

  /**
   * @function deleteObject
   * Deletes the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.s3VersionId] Optional specific s3VersionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the delete object operation
   */
  async deleteObject({ filePath, s3VersionId = undefined, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: s3VersionId
    };

    return this._getS3Client(data).send(new DeleteObjectCommand(params));
  },

  /**
   * @function deleteObjectTagging
   * Deletes the tags of the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.s3VersionId] Optional specific s3VersionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the delete object tagging operation
   */
  async deleteObjectTagging({ filePath, s3VersionId = undefined, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: s3VersionId
    };

    return this._getS3Client(data).send(new DeleteObjectTaggingCommand(params));
  },

  /**
   * @function getBucketEncryption
   * Checks if encryption of objects is enabled by default on bucket
   * @param {string} [bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the get bucket encryption operation
   */
  async getBucketEncryption(bucketId = undefined) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket
    };

    return this._getS3Client(data).send(new GetBucketEncryptionCommand(params));
  },

  /**
   * @function getBucketVersioning
   * Checks if versioning of objects is enabled on bucket
   * @param {string} [bucketId] Optional bucketId
   * @returns {Promise<boolean>} true if versioning enabled otherwise false
   */
  async getBucketVersioning(bucketId = undefined) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket
    };
    const response = await this._getS3Client(data).send(new GetBucketVersioningCommand(params));
    return Promise.resolve(response.Status === 'Enabled');
  },

  /**
   * @function getObjectTagging
   * Gets the tags of the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.s3VersionId=undefined] Optional specific s3VersionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the get object tagging operation
   */
  async getObjectTagging({ filePath, s3VersionId = undefined, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: s3VersionId
    };

    return this._getS3Client(data).send(new GetObjectTaggingCommand(params));
  },

  /**
   * @function headBucket
   * Checks if a bucket exists and if the S3Client has correct access permissions
   * You must supply either a `bucketId`, or the full S3 client credentials to test against
   * @param {string} [options.bucketId] Optional bucketId
   * @param {string} [options.accessKeyId] Optional S3 accessKeyId
   * @param {string} [options.bucket] Optional S3 bucket
   * @param {string} [options.endpoint] Optional S3 endpoint
   * @param {string} [options.key] Optional S3 key/prefix
   * @param {string} [options.region] Optional S3 region
   * @param {string} [options.secretAccessKey] Optional S3 secretAccessKey
   * @returns {Promise<HeadBucketCommandOutput>} The response of the head bucket operation
   */
  async headBucket(options = {}) {
    const data = options.bucketId
      ? await utils.getBucket(options.bucketId)
      : options;
    const params = {
      Bucket: data.bucket,
    };

    return this._getS3Client(data).send(new HeadBucketCommand(params));
  },

  /**
   * @function headObject
   * Gets the object headers for the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {string} [options.s3VersionId] Optional version ID used to reference a speciific version of the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<HeadObjectCommandOutput>} The response of the head object operation
   * @throws If object is not found
   */
  async headObject({ filePath, s3VersionId = undefined, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: s3VersionId
    };
    return this._getS3Client(data).send(new HeadObjectCommand(params));
  },

  /**
   * @function listAllObjects
   * Lists all objects in the bucket with the prefix of `filePath`.
   * Performs pagination behind the scenes if required.
   * @param {string} [options.filePath=undefined] Optional filePath of the objects
   * @param {string} [options.bucketId=undefined] Optional bucketId
   * @param {boolean} [options.precisePath=true] Optional boolean for filtering results based on the precise path
   * @returns {Promise<object[]>} An array of objects matching the criteria
   */
  async listAllObjects({ filePath = undefined, bucketId = undefined, precisePath = true } = {}) {
    const key = filePath ?? (await utils.getBucket(bucketId)).key;
    const path = key !== DELIMITER ? key : '';

    const objects = [];

    let incomplete = false;
    let nextToken = undefined;
    do {
      const { Contents, IsTruncated, NextContinuationToken } = await this.listObjectsV2({
        filePath: path,
        continuationToken: nextToken,
        bucketId: bucketId
      });

      if (Contents) objects.push(
        ...Contents.filter(object => !precisePath || utils.isAtPath(path, object.Key))
      );
      incomplete = IsTruncated;
      nextToken = NextContinuationToken;
    } while (incomplete);

    return Promise.resolve(objects);
  },

  /**
   * @function listAllObjectVersions
   * Lists all objects in the bucket with the prefix of `filePath`.
   * Performs pagination behind the scenes if required.
   * @param {string} [options.filePath=undefined] Optional filePath of the objects
   * @param {string} [options.bucketId=undefined] Optional bucketId
   * @param {boolean} [options.precisePath=true] Optional boolean for filtering results based on the precise path
   * @param {boolean} [options.filterLatest=false] Optional boolean for filtering results to only entries
   * with IsLatest being true
   * @returns {Promise<object>} An object containg an array of DeleteMarkers and Versions
   */
  async listAllObjectVersions({
    filePath = undefined, bucketId = undefined, precisePath = true, filterLatest = false
  } = {}) {
    const key = filePath ?? (await utils.getBucket(bucketId)).key;
    const path = key !== DELIMITER ? key : '';

    const deleteMarkers = [];
    const versions = [];

    let incomplete = false;
    let nextKeyMarker = undefined;
    do {
      const { DeleteMarkers, Versions, IsTruncated, NextKeyMarker } = await this.listObjectVersion({
        filePath: path,
        keyMarker: nextKeyMarker,
        bucketId: bucketId
      });

      if (DeleteMarkers) deleteMarkers.push(
        ...DeleteMarkers
          .filter(object => !precisePath || utils.isAtPath(path, object.Key))
          .filter(object => !filterLatest || object.IsLatest === true)
      );
      if (Versions) versions.push(
        ...Versions
          .filter(object => !precisePath || utils.isAtPath(path, object.Key))
          .filter(object => !filterLatest || object.IsLatest === true)
      );
      incomplete = IsTruncated;
      nextKeyMarker = NextKeyMarker;
    } while (incomplete);

    return Promise.resolve({ DeleteMarkers: deleteMarkers, Versions: versions });
  },

  /**
   * @function listObjectsV2
   * Lists the objects in the bucket with the prefix of `filePath`
   * @param {string} [options.filePath=undefined] Optional filePath of the objects
   * @param {string} [options.continuationToken=undefined] Optional continuationtoken for pagination
   * @param {number} [options.maxKeys=undefined] Optional maximum number of keys to return
   * @param {string} [options.bucketId=undefined] Optional bucketId
   * @returns {Promise<object>} The response of the list objects v2 operation
   */
  async listObjectsV2({
    filePath = undefined, continuationToken = undefined, maxKeys = undefined, bucketId = undefined
  } = {}) {
    const data = await utils.getBucket(bucketId);
    const prefix = data.key !== DELIMITER ? data.key : '';
    const params = {
      Bucket: data.bucket,
      ContinuationToken: continuationToken,
      MaxKeys: maxKeys,
      Prefix: filePath ?? prefix // Must filter via 'prefix' - https://stackoverflow.com/a/56569856
    };

    return this._getS3Client(data).send(new ListObjectsV2Command(params));
  },

  /**
   * @function ListObjectVersion
   * Lists the versions for the object at `filePath`
   * @param {string} [options.filePath=undefined] Optional filePath of the objects
   * @param {string} [options.keyMarker=undefined] Optional keyMarker for pagination
   * @param {number} [options.maxKeys=undefined] Optional maximum number of keys to return
   * @param {string} [options.bucketId=undefined] Optional bucketId
   * @returns {Promise<object>} The response of the list object version operation
   */
  async listObjectVersion({
    filePath = undefined, keyMarker = undefined, maxKeys = undefined, bucketId = undefined
  } = {}) {
    const data = await utils.getBucket(bucketId);
    const prefix = data.key !== DELIMITER ? data.key : '';
    const params = {
      Bucket: data.bucket,
      KeyMarker: keyMarker,
      MaxKeys: maxKeys,
      Prefix: filePath ?? prefix // Must filter via 'prefix' - https://stackoverflow.com/a/56569856
    };

    return this._getS3Client(data).send(new ListObjectVersionsCommand(params));
  },

  /**
   * @function presignUrl
   * Generates a presigned url for the `command` with a limited expiration window
   * @param {object} command The associated S3 command to generate a presigned URL for
   * @param {number} [expiresIn=300] The number of seconds this signed url will be valid for.
   * Defaults to expire after 5 minutes.
   * @param {string} [bucketId] Optional bucketId
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
  async presignUrl(command, expiresIn = defaultTempExpiresIn, bucketId = undefined) {
    const data = await utils.getBucket(bucketId);
    return getSignedUrl(this._getS3Client(data), command, { expiresIn });
  },

  /**
   * @function putBucketEncryption
   * @param {string} [bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the put bucket encryption operation
   */
  async putBucketEncryption(bucketId = undefined) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      ServerSideEncryptionConfiguration: {
        Rules: [{
          ApplyServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256'
          }
        }]
      }
    };

    return this._getS3Client(data).send(new PutBucketEncryptionCommand(params));
  },

  /**
   * @function putObject
   * Puts the object `stream` at the `id` path
   * @param {stream} options.stream The binary stream of the object
   * @param {string} options.name The file name of the object
   * @param {number} options.length The content length of the object
   * @param {string} options.mimeType The mime type of the object
   * @param {object} [options.metadata] Optional object containing key/value pairs for metadata
   * @param {object} [options.tags] Optional object containing key/value pairs for tags
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the put object operation
   */
  async putObject({ stream, name, length, mimeType, metadata, tags, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: utils.joinPath(data.key, name),
      Body: stream,
      ContentLength: length,
      ContentType: mimeType,
      Metadata: metadata,
      Tagging: Object.entries({ ...tags }).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
      // TODO: Consider adding API param support for Server Side Encryption
      // ServerSideEncryption: 'AES256'
    };

    return this._getS3Client(data).send(new PutObjectCommand(params));
  },

  /**
   * @function hasPublicAcl
   * checks for a S3 public 'canned' ACL for the given key
   * @param {object} data An object containing accessKeyId, bucket, endpoint, key,
   * @param {string} key Key of the resource
   * @returns {Promise<boolean>} whether the given resource has a public ACL
   */
  async hasPublicAcl(data, key) {
    let hasPublicAcl = false;
    if (data.key !== key) {
      const existingAcl = await this._getS3Client(data).send(new GetObjectAclCommand({
        Bucket: data.bucket,
        Key: key
      }));
      const existingGrants = existingAcl.Grants;
      return existingGrants.some(grant => grant.Grantee?.URI === ALLUSERS && grant.Permission === 'READ');
    }
    return hasPublicAcl;
  },

  /**
   * removes public ACL, where ACL grants ALLUSERS READ permission,
   * for all objects at or below a given path
   * note: will also remove this type of ACL set by other applications
   */
  async removePublicACL(bucketId, path, recursive = false) {
    try {
      const data = await utils.getBucket(bucketId);
      const key = utils.stripDelimit(path);
      let objects = [];

      // list all objects at and below provided path (key)
      if (recursive) {
        const s3Response = await this.listAllObjectVersions({ filePath: key, bucketId: bucketId, precisePath: false });
        log.info(`Found ${s3Response.Versions.length} object versions and ${s3Response.DeleteMarkers.length} 
        delete markers in S3 for bucketId ${data.bucketId}`, { function: 'syncBucketRecursive' });
        const s3Keys = [...new Set([
          ...s3Response.DeleteMarkers.map(object => object.Key),
          ...s3Response.Versions.map(object => object.Key),
        ])];
        objects = s3Keys;
      } else {
        objects = [key];
      }
      log.info(`Removing ACL's from ${objects.length} objects`, { function: 'removePublicACL' });

      // for each object update existing ACL to remove READ on ALLUSERS
      // for (const objKey of objects.slice(0, 1000)) { // limit to 1000 to avoid timeouts
      for (const objKey of objects) {
        const existingAcl = await this._getS3Client(data).send(new GetObjectAclCommand({
          Bucket: data.bucket,
          Key: objKey
        }));
        const existingGrants = existingAcl.Grants;
        const hasPublicAcl = existingGrants.some(
          grant => grant.Grantee?.URI === ALLUSERS && grant.Permission === 'READ'
        );
        if (hasPublicAcl) {
          await this._getS3Client(data).send(new PutObjectAclCommand({
            AccessControlPolicy: {
              Grants: existingGrants
                .filter(grant => grant.Grantee?.URI !== ALLUSERS && grant.Permission !== 'READ')
                .map(grant => {
                  return {
                    Grantee: grant.Grantee,
                    Permission: grant.Permission,
                  };
                }),
              Owner: existingAcl.Owner
            },
            Bucket: data.bucket,
            Key: objKey,
          }));
        }
      }
    } catch (error) {
      log.error('Error in removePublicACL:', error);
      throw error;
    }
  },

  /**
   * @function updatePublic
   * Updates the S3 Bucket Policies for the given resource
   * any non-COMS Bucket Policies (Sid starts with `coms::`) are preserved
   * NOTE: This function will remove legacy ACL's for all resources at or below path when setting to private
   * to ensure objects are not inadvertently left public due to ACL settings
   * @param {string} path the path of the resource
   * @param {boolean} whether given resource should be set to public
   * @param {string} bucketId of COMS bucket for the resource
   * @returns {Promise<object>} The S3 PutBucketPolicyCommand response
   */
  async updatePublic({ path, public: setAsPublic = false, bucketId }) {
    const data = await utils.getBucket(bucketId);
    const isPrefix = data.key + '/' === path;
    const resource = data.bucket + '/' + path;
    let existingPolicies = [];
    let s3Response = [];

    // Get existing policy
    try {
      const existingPolicy = await this._getS3Client(data).send(new GetBucketPolicyCommand({ Bucket: data.bucket }));
      existingPolicies = JSON.parse(existingPolicy.Policy).Statement;
      // If COMS policy found for any parent prefix, throw error, exceptions from inherited policies are not permitted
      const parentPolicy = existingPolicies.find(policy =>
        `coms::${resource}`.startsWith(policy.Sid) &&
        `coms::${resource}` !== policy.Sid);
      if (parentPolicy) {
        throw new Error(`Unable to override Public status set on folder: ${parentPolicy.Resource}`);
      }
    } catch (e) {
      log.debug('No existing policy found', { function: 'updatePublic' });
    }

    // --- Update policy
    // keep non-coms and sibling policies
    let newPolicies = existingPolicies.filter(policy => {
      return !policy.Sid.startsWith(utils.trimResourcePath(`coms::${resource}`));
    });
    // if making resource private and no other policies remain, remove entire policy
    if (newPolicies.length === 0 && !setAsPublic) {
      await this._getS3Client(data).send(new DeleteBucketPolicyCommand({ Bucket: data.bucket }));
    }
    // if making public add Allow rule for this resource (and below)
    if (setAsPublic) {
      const resourceKey = isPrefix ? resource + '*' : resource; // prefixes/need/trailing/wildcard/*
      newPolicies
        .push({
          Action: ['s3:GetObject', 's3:GetObjectVersion'],
          Resource: resourceKey,
          Effect: 'Allow',
          Principal: '*',
          Sid: 'coms::' + resource,
        });
    }
    if (newPolicies.length > 0) {
      s3Response = await this._getS3Client(data).send(new PutBucketPolicyCommand({
        Bucket: data.bucket,
        Policy: JSON.stringify({ Version: '2012-10-17', Statement: newPolicies })
      }));
    }
    // -- remove all ACL's for this resource and below as precaution to user
    // if updating a single object or setting a folder private, 
    if (!isPrefix || !setAsPublic) await this.removePublicACL(bucketId, path, isPrefix);

    return s3Response;
  },

  /**
   * @function getPublic
   * Checks for a Bucket Policy or ACL that will make the given resource public
   * @param {string} options.path The path of the resource to check
   * @param {string} [options.bucketId] Optional bucketId to retrieve bucket configuration
   * @param {object} [options.bucket] Optional bucket object containing bucketId (alternative to bucketId)
   * @returns {Promise<boolean>} True if the resource is public via policy or ACL, false otherwise
   */
  async getPublic({ path, bucketId = undefined, bucket = undefined }) {
    const bucketData = bucket ? { ...bucket, region: DEFAULTREGION } : await utils.getBucket(bucketId);
    const resource = bucketData.bucket + '/' + path;
    const hasPublicPolicy = await this.hasEffectivePublicPolicy(resource, bucketData);
    // if resource is an object, check for public ACL's (ACL's cannot apply to prefixes)
    const hasPublicAcl = bucketData.key !== resource ? await this.hasPublicAcl(bucketData, path) : false;
    // Check for COMS Bucket Policy for this resource
    return hasPublicAcl || hasPublicPolicy;
  },

  /**
   * @function hasEffectivePublicPolicy
   * check for a Bucket Policy that will make the given resource public
   * @param {*} resource
   * @param {*} bucketData
   */
  async hasEffectivePublicPolicy(resource, bucketData) {
    try {
      const existingPolicy = await this._getS3Client(bucketData)
        .send(new GetBucketPolicyCommand({ Bucket: bucketData.bucket }));
      const statement = JSON.parse(existingPolicy.Policy).Statement;
      // A Deny policy on resource or above, which override Allow policies will set public status to false
      const denyPolicies = statement
        .filter(p => {
          return p.Effect === 'Deny' &&
            resource.startsWith(utils.trimResourcePath(p.Resource)) &&
            p.Principal === '*';
        });
      if (denyPolicies.length > 0) {
        return false;
      }
      // Any Allow policy on resource or above will set public status to true
      else {
        const allowPolicies = statement
          .filter(p => {
            return p.Effect === 'Allow' &&
              resource.startsWith(utils.trimResourcePath(p.Resource)) &&
              p.Principal === '*';
          })
          .sort((a, b) => b.Resource.length - a.Resource.length);
        return (allowPolicies.length > 0) ? true : false;
      }
    } catch (e) {
      log.debug('No existing effective policies found', { function: 'hasEffectivePublicPolicy' });
      return false;
    }
  },

  /**
   * @function putObjectTagging
   * Puts the tags of the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {string} options.tags Array of key/value pairs (eg: `([{ Key: 'colour', Value: 'red' }]`)
   * @param {number} [options.s3VersionId] Optional specific s3VersionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the put object tagging operation
   */
  async putObjectTagging({ filePath, tags, s3VersionId = undefined, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      Tagging: {
        TagSet: tags
      },
      VersionId: s3VersionId
    };

    return this._getS3Client(data).send(new PutObjectTaggingCommand(params));
  },

  /**
   * @function readObject
   * Reads the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.s3VersionId] Optional specific s3VersionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the get object operation
   */
  async readObject({ filePath, s3VersionId = undefined, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: s3VersionId
    };

    return this._getS3Client(data).send(new GetObjectCommand(params));
  },

  /**
   * @function readSignedUrl
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.expiresIn] The number of seconds this signed url will be valid for
   * @param {number} [options.s3VersionId] Optional specific s3VersionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
  async readSignedUrl({ filePath, expiresIn, s3VersionId = undefined, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const expires = expiresIn || defaultTempExpiresIn;
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: s3VersionId
    };

    return this.presignUrl(new GetObjectCommand(params), expires, bucketId);
  },

  /**
   * @function upload
   * Uploads the object `stream` at the `id` path
   * @param {stream} options.stream The binary stream of the object
   * @param {string} options.name The file name of the object
   * @param {number} options.length The content length of the object
   * @param {string} options.mimeType The mime type of the object
   * @param {object} [options.metadata] Optional object containing key/value pairs for metadata
   * @param {object} [options.tags] Optional object containing key/value pairs for tags
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<CompleteMultipartUploadCommandOutput | AbortMultipartUploadCommandOutput>}
   * The response of the put object operation
   */
  async upload({ stream, name, length, mimeType, metadata, tags, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);

    const upload = new Upload({
      client: this._getS3Client(data),
      params: {
        Bucket: data.bucket,
        Key: utils.joinPath(data.key, name),
        Body: stream,
        ContentType: mimeType,
        Metadata: metadata,
        Tagging: Object.entries({ ...tags }).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
        // TODO: Consider adding API param support for Server Side Encryption
        // ServerSideEncryption: 'AES256'
      },
      partSize: utils.calculatePartSize(length)
    });

    upload.on('httpUploadProgress', progress => {
      log.debug(progress, { function: 'onhttpUploadProgress' });
    });

    return upload.done();
  }
};

module.exports = objectStorageService;
