const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectTaggingCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutObjectCommand,
  PutBucketEncryptionCommand,
  PutObjectTaggingCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const config = require('config');

const { MetadataDirective, TaggingDirective } = require('../components/constants');
const log = require('../components/log')(module.filename);
const utils = require('../components/utils');

// Get app configuration
const defaultTempExpiresIn = parseInt(config.get('objectStorage.defaultTempExpiresIn'), 10);

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
      log.error('Unable to generate S3Client due to missing arguments', { function: '_getS3Client'});
    }

    return new S3Client({
      apiVersion: '2006-03-01',
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      },
      endpoint: endpoint,
      forcePathStyle: true,
      region: region
    });
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
      CopySource: `${data.bucket}/${copySource}`,
      Key: filePath,
      Metadata: metadata,
      MetadataDirective: metadataDirective,
      TaggingDirective: taggingDirective,
      VersionId: s3VersionId
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
      ? await utils.getBucket(options.bucketId, true)
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
   * @deprecated Use `listObjectsV2` instead
   * @function listObjects
   * Lists the objects in the bucket with the prefix of `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.maxKeys] Optional maximum number of keys to return
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the list objects operation
   */
  async listObjects({ filePath, maxKeys = undefined, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Prefix: filePath, // Must filter via "prefix" - https://stackoverflow.com/a/56569856
      MaxKeys: maxKeys
    };

    return this._getS3Client(data).send(new ListObjectsCommand(params));
  },

  /**
   * @function listObjectsV2
   * Lists the objects in the bucket with the prefix of `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {string} [options.continuationToken] Optional continuationtoken for pagination
   * @param {number} [options.maxKeys] Optional maximum number of keys to return
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the list objects operation
   */
  async listObjectsV2({ filePath, continuationToken = undefined, maxKeys = undefined, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      ContinuationToken: continuationToken,
      Prefix: filePath, // Must filter via "prefix" - https://stackoverflow.com/a/56569856
      MaxKeys: maxKeys
    };

    return this._getS3Client(data).send(new ListObjectsV2Command(params));
  },

  /**
   * @function ListObjectVersion
   * Lists the versions for the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the list object version operation
   */
  async listObjectVersion({ filePath, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Prefix: filePath // Must filter via "prefix" - https://stackoverflow.com/a/56569856
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
   * @deprecated Use `upload` instead
   * @function putObject
   * Puts the object `stream` at the `id` path
   * @param {stream} options.stream The binary stream of the object
   * @param {string} options.id The filePath id of the object
   * @param {string} options.mimeType The mime type of the object
   * @param {object} [options.metadata] Optional object containing key/value pairs for metadata
   * @param {object} [options.tags] Optional object containing key/value pairs for tags
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the put object operation
   */
  async putObject({ stream, id, mimeType, metadata, tags, bucketId = undefined }) {
    const data = await utils.getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: await utils.getPath(id),
      Body: stream,
      ContentType: mimeType,
      Metadata: metadata,
      Tagging: Object.entries({ ...tags }).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
      // TODO: Consider adding API param support for Server Side Encryption
      // ServerSideEncryption: 'AES256'
    };

    // TODO: Consider refactoring to use Upload instead from @aws-sdk/lib-storage
    return this._getS3Client(data).send(new PutObjectCommand(params));
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
   * @param {string} options.mimeType The mime type of the object
   * @param {object} [options.metadata] Optional object containing key/value pairs for metadata
   * @param {object} [options.tags] Optional object containing key/value pairs for tags
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<CompleteMultipartUploadCommandOutput | AbortMultipartUploadCommandOutput>} The response of the put object operation
   */
  async upload({ stream, name, mimeType, metadata, tags, bucketId = undefined }) {
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
    });

    return upload.done();
  }
};

module.exports = objectStorageService;
