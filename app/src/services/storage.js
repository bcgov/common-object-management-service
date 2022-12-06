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
  ListObjectVersionsCommand,
  PutObjectCommand,
  PutBucketEncryptionCommand,
  PutObjectTaggingCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const config = require('config');

const log = require('../components/log')(module.filename);
const utils = require('../components/utils');
const { MAXKEYS, MetadataDirective, TaggingDirective } = require('../components/constants');
const { read: readBucket } = require('./bucket');

// Get app configuration
const defaultRegion = 'us-east-1'; // Need to specify valid AWS region or it'll explode ('us-east-1' is default, 'ca-central-1' for Canada)
const defaultTempExpiresIn = parseInt(config.get('objectStorage.defaultTempExpiresIn'), 10);

/**
 * The Core S3 Object Storage Service
 * @see {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/}
 */
const objectStorageService = {
  /**
   * @private
   * @function _getBucket
   * Utility function for acquiring core S3 bucket credential information with
   * graceful default fallback
   * @param {string} [bucketId] An optional bucketId to lookup
   * @returns {object} An object containing accessKeyId, bucket, endpoint,
   * region and secretAccessKey attributes
   */
  _getBucket: async (bucketId = undefined) => {
    const data = {
      accessKeyId: config.get('objectStorage.accessKeyId'),
      bucket: config.get('objectStorage.bucket'),
      endpoint: config.get('objectStorage.endpoint'),
      key: config.get('objectStorage.key'),
      region: defaultRegion,
      secretAccessKey: config.get('objectStorage.secretAccessKey')
    };

    if (bucketId && config.has('db.enabled')) {
      try {
        const bucketData = await readBucket(bucketId);
        data.accessKeyId = bucketData.accessKeyId;
        data.bucket = bucketData.bucket;
        data.endpoint = bucketData.endpoint;
        data.key = bucketData.key;
        data.secretAccessKey = bucketData.secretAccessKey;
        if (bucketData.region) data.region = bucketData.region;
      } catch (err) {
        log.warn(err.message, { function: '_getBucket'});
      }
    }

    return data;
  },

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
   * @param {string} [options.versionId] Optional versionId to copy from
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the delete object operation
   */
  async copyObject({
    copySource,
    filePath,
    metadata,
    tags,
    metadataDirective = MetadataDirective.COPY,
    taggingDirective = TaggingDirective.COPY,
    versionId = undefined,
    bucketId = undefined
  }) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      CopySource: `${data.bucket}/${copySource}`,
      Key: filePath,
      Metadata: metadata,
      MetadataDirective: metadataDirective,
      TaggingDirective: taggingDirective,
      VersionId: versionId
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
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the delete object operation
   */
  async deleteObject({ filePath, versionId = undefined, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: versionId
    };

    return this._getS3Client(data).send(new DeleteObjectCommand(params));
  },

  /**
   * @function deleteObjectTagging
   * Deletes the tags of the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the delete object tagging operation
   */
  async deleteObjectTagging({ filePath, versionId = undefined, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: versionId
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
    const data = await this._getBucket(bucketId);
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
    const data = await this._getBucket(bucketId);
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
   * @param {number} [options.versionId=undefined] Optional specific versionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the get object tagging operation
   */
  async getObjectTagging({ filePath, versionId = undefined, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: versionId
    };

    return this._getS3Client(data).send(new GetObjectTaggingCommand(params));
  },

  /**
   * @function headBucket
   * Checks if a bucket exists and if the S3Client has correct access permissions
   * @param {string} [bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the head bucket operation
   */
  async headBucket(bucketId = undefined) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
    };

    return this._getS3Client(data).send(new HeadBucketCommand(params));
  },

  /**
   * @function headObject
   * Gets the object headers for the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {string} [options.versionId] Optional version ID used to reference a speciific version of the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the head object operation
   */
  async headObject({ filePath, versionId = undefined, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: versionId
    };
    return this._getS3Client(data).send(new HeadObjectCommand(params));
  },

  /**
   * @function listObjects
   * Lists the objects in the bucket with the prefix of `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.maxKeys=2^31-1] The maximum number of keys to return
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the list objects operation
   */
  async listObjects({ filePath, maxKeys = MAXKEYS, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Prefix: filePath, // Must filter via "prefix" - https://stackoverflow.com/a/56569856
      MaxKeys: maxKeys
    };

    return this._getS3Client(data).send(new ListObjectsCommand(params));
  },

  /**
   * @function ListObjectVerseion
   * Lists the versions for the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the list object version operation
   */
  async listObjectVersion({ filePath, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
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
    const data = await this._getBucket(bucketId);
    return getSignedUrl(this._getS3Client(data), command, { expiresIn });
  },

  /**
   * @function putBucketEncryption
   * @param {string} [bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the put bucket encryption operation
   */
  async putBucketEncryption(bucketId = undefined) {
    const data = await this._getBucket(bucketId);
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
   * @param {string} options.id The filePath id of the object
   * @param {string} options.mimeType The mime type of the object
   * @param {object} [options.metadata] Optional object containing key/value pairs for metadata
   * @param {object} [options.tags] Optional object containing key/value pairs for tags
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the put object operation
   */
  async putObject({ stream, id, mimeType, metadata, tags, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: utils.getPath(id),
      Body: stream,
      ContentType: mimeType,
      Metadata: {
        ...metadata,
        id: id // enforce metadata `id: <object ID>`
      },
      // TODO: Consider adding API param support for Server Side Encryption
      // ServerSideEncryption: 'AES256'
    };

    if (tags) {
      params.Tagging = Object.entries(tags).map(([key, value]) => {
        return `${key}=${encodeURIComponent(value)}`;
      }).join('&');
    }

    // TODO: Consider refactoring to use Upload instead from @aws-sdk/lib-storage
    return this._getS3Client(data).send(new PutObjectCommand(params));
  },

  /**
   * @function putObjectTagging
   * Gets the tags of the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {string} options.tags Array of key/value pairs
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the put object tagging operation
   */
  async putObjectTagging({ filePath, tags, versionId = undefined, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      Tagging: {
        TagSet: tags
      },
      VersionId: versionId
    };

    return this._getS3Client(data).send(new PutObjectTaggingCommand(params));
  },

  /**
   * @function readObject
   * Reads the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the get object operation
   */
  async readObject({ filePath, versionId = undefined, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: versionId
    };

    return this._getS3Client(data).send(new GetObjectCommand(params));
  },

  /**
   * @function readSignedUrl
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.expiresIn] The number of seconds this signed url will be valid for
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
  async readSignedUrl({ filePath, expiresIn, versionId = undefined, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);
    const expires = expiresIn || defaultTempExpiresIn;
    const params = {
      Bucket: data.bucket,
      Key: filePath,
      VersionId: versionId
    };

    return this.presignUrl(new GetObjectCommand(params), expires);
  },

  /**
   * @function upload
   * Uploads the object `stream` at the `id` path
   * @param {stream} options.stream The binary stream of the object
   * @param {string} options.id The filePath id of the object
   * @param {string} options.mimeType The mime type of the object
   * @param {object} [options.metadata] Optional object containing key/value pairs for metadata
   * @param {object} [options.tags] Optional object containing key/value pairs for tags
   * @param {string} [options.bucketId] Optional bucketId
   * @returns {Promise<object>} The response of the put object operation
   */
  async upload({ stream, id, mimeType, metadata, tags, bucketId = undefined }) {
    const data = await this._getBucket(bucketId);

    const upload = new Upload({
      client: this._getS3Client(data),
      params: {
        Bucket: data.bucket,
        Key: utils.getPath(id),
        Body: stream,
        ContentType: mimeType,
        Metadata: {
          ...metadata,
          id: id // enforce metadata `id: <object ID>`
        },
        // TODO: Consider adding API param support for Server Side Encryption
        // ServerSideEncryption: 'AES256'
      },
    });

    if (tags) {
      upload.tags = Object.entries(tags).map(([key, value]) => {
        return { 'Key': key, 'Value': value };
      });
    }

    return upload.done();
  }
};

module.exports = objectStorageService;
