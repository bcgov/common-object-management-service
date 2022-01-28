const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectVersionsCommand,
  PutObjectCommand,
  S3Client
} = require('@aws-sdk/client-s3');
const config = require('config');

const utils = require('./utils');

// Get app configuration
const endpoint = config.get('objectStorage.endpoint');
const bucket = config.get('objectStorage.bucket');
const key = utils.delimit(config.get('objectStorage.key'));
const accessKeyId = config.get('objectStorage.accessKeyId');
const secretAccessKey = config.get('objectStorage.secretAccessKey');

const objectStorageService = {
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

  deleteObject({ filePath }) {
    const params = {
      Bucket: bucket,
      Key: filePath
    };

    return this._s3Client.send(new DeleteObjectCommand(params));
  },

  headObject({ filePath }) {
    const params = {
      Bucket: bucket,
      Key: filePath
    };

    return this._s3Client.send(new HeadObjectCommand(params));
  },

  listObjectVersion({ filePath }) {
    const params = {
      Bucket: bucket,
      Prefix: filePath // Must filter via "prefix" - https://stackoverflow.com/a/56569856
    };

    return this._s3Client.send(new ListObjectVersionsCommand(params));
  },

  presignUrl(command, { expiresIn }) {
    if (!expiresIn) expiresIn = 300; // Default expire to 5 minutes
    return getSignedUrl(this._s3Client, command, { expiresIn });
  },

  putObject({ stream, id, originalName, mimeType, metadata, tags }) {
    const params = {
      Bucket: bucket,
      ContentType: mimeType,
      Key: utils.join(key, id),
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

  readObject({ filePath, versionId }) {
    const params = {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    };

    return this._s3Client.send(new GetObjectCommand(params));
  },

  readSignedUrl({ filePath, versionId }) {
    const params = {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    };

    return this.presignUrl(new GetObjectCommand(params), 300);
  }
};

module.exports = objectStorageService;
