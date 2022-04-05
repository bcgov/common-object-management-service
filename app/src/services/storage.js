const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectVersionsCommand,
  PutObjectCommand,
  S3Client
} = require('@aws-sdk/client-s3');
const config = require('config');

const { getPath } = require('../components/utils');

// Get app configuration
const endpoint = config.get('objectStorage.endpoint');
const bucket = config.get('objectStorage.bucket');
const defaultTempExpiresIn = parseInt(config.get('objectStorage.defaultTempExpiresIn'), 10);
const accessKeyId = config.get('objectStorage.accessKeyId');
const secretAccessKey = config.get('objectStorage.secretAccessKey');

/**
 * The Core S3 Object Storage Service
 * @see {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/}
 */
const objectStorageService = {
  /**
   * @private
   * @property _s3Client
   * The AWS S3Client used for interacting with S3 compatible storage
   * @param {Readable} stream A readable stream object
   * @returns {object} A pre-configured S3 Client object
   */
  _s3Client: new S3Client({
    apiVersion: '2006-03-01',
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
    endpoint: endpoint,
    forcePathStyle: true,
    region: 'us-east-1' // Need to specify valid AWS region or it'll explode ('us-east-1' is default, 'ca-central-1' for Canada)
  }),

  /**
   * @function deleteObject
   * Deletes the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @returns {Promise<object>} The response of the delete object operation
   */
  deleteObject({ filePath, versionId }) {
    const params = {
      Bucket: bucket,
      Key: filePath
    };
    if (versionId) params.VersionId = versionId;

    return this._s3Client.send(new DeleteObjectCommand(params));
  },

  /**
   * @function headBucket
   * Checks if a bucket exists and if the S3Client has correct access permissions
   * @returns {Promise<object>} The response of the head bucket operation
   */
  headBucket() {
    const params = {
      Bucket: bucket,
    };

    return this._s3Client.send(new HeadBucketCommand(params));
  },

  /**
   * @function headObject
   * Gets the object headers for the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @returns {Promise<object>} The response of the head object operation
   */
  headObject({ filePath }) {
    const params = {
      Bucket: bucket,
      Key: filePath
    };

    return this._s3Client.send(new HeadObjectCommand(params));
  },

  /**
   * @function listObjects
   * Lists the objects in the bucket with the prefix of `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.maxKeys=1000] The maximum number of keys to return
   * @returns {Promise<object>} The response of the list objects operation
   */
  listObjects({ filePath, maxKeys=1000 }) {
    const params = {
      Bucket: bucket,
      Prefix: filePath, // Must filter via "prefix" - https://stackoverflow.com/a/56569856
      MaxKeys: maxKeys
    };

    return this._s3Client.send(new ListObjectsCommand(params));
  },

  /**
   * @function ListObjectVerseion
   * Lists the versions for the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @returns {Promise<object>} The response of the list object version operation
   */
  listObjectVersion({ filePath }) {
    const params = {
      Bucket: bucket,
      Prefix: filePath // Must filter via "prefix" - https://stackoverflow.com/a/56569856
    };

    return this._s3Client.send(new ListObjectVersionsCommand(params));
  },

  /**
   * @function presignUrl
   * Generates a presigned url for the `command` with a limited expiration window
   * @param {number} [expiresIn=300] The number of seconds this signed url will be valid for
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
  presignUrl(command, expiresIn=defaultTempExpiresIn) { // Default expire to 5 minutes
    return getSignedUrl(this._s3Client, command, { expiresIn });
  },

  /**
   * @function putObject
   * Puts the object `stream` at the `id` path
   * @param {stream} options.stream The binary stream of the object
   * @param {string} options.id The filePath id of the object
   * @param {string} options.originalName The original filename of the object
   * @param {string} options.mimeType The mime type of the object
   * @param {object} [options.metadata] Optional object containing key/value pairs for metadata
   * @param {object} [options.tags] Optional object containing key/value pairs for tags
   * @returns {Promise<object>} The response of the put object operation
   */
  putObject({ stream, id, originalName, mimeType, metadata, tags }) {
    const params = {
      Bucket: bucket,
      ContentType: mimeType,
      Key: getPath(id),
      Body: stream,
      Metadata: {
        ...metadata, // Take input metadata first, but always enforce name and id key behavior
        name: originalName,
        id: id
      },
      ServerSideEncryption: 'AES256'
    };

    if (tags) {
      params.Tagging = Object.entries(tags).map(([key, value]) => {
        return `${key}=${encodeURIComponent(value)}`;
      }).join('&');
    }

    return this._s3Client.send(new PutObjectCommand(params));
  },

  /**
   * @function readObject
   * Reads the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @returns {Promise<object>} The response of the get object operation
   */
  readObject({ filePath, versionId }) {
    const params = {
      Bucket: bucket,
      Key: filePath
    };
    if (versionId) params.VersionId = versionId;

    return this._s3Client.send(new GetObjectCommand(params));
  },

  /**
   * @function readSignedUrl
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @param {number} [options.expiresIn] The number of seconds this signed url will be valid for
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
  readSignedUrl({ filePath, versionId, expiresIn }) {
    const expires = expiresIn ? expiresIn : defaultTempExpiresIn;
    const params = {
      Bucket: bucket,
      Key: filePath
    };
    if (versionId) params.VersionId = versionId;


    return this.presignUrl(new GetObjectCommand(params), expires);
  }
};

module.exports = objectStorageService;
