const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Retrieve configuration from environment variables
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;

// Initialize S3Client to connect to Cloudflare R2
const s3Client = new S3Client({
  region: "auto", // Cloudflare R2 requires region to be "auto"
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
});

/**
 * Upload file to Cloudflare R2 as a Buffer
 * @param {Buffer} fileBuffer - Buffer of file data
 * @param {string} fileName - File key name on R2 (must be unique)
 * @param {string} mimeType - File mimetype (e.g., application/pdf)
 * @returns {Promise<string>} - Returns the key of the uploaded file
 */
const uploadFile = async (fileBuffer, fileName, mimeType) => {
  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  return fileName; // Return key to save in database
};

/**
 * Delete file on Cloudflare R2
 * @param {string} fileKey - Key of the file to delete
 */
const deleteFile = async (fileKey) => {
  if (!fileKey) return;
  const command = new DeleteObjectCommand({
    Bucket: r2BucketName,
    Key: fileKey,
  });

  await s3Client.send(command);
};

/**
 * Generate a temporary signed GET URL to download private files
 * The URL expires in 5 minutes (300 seconds)
 * @param {string} fileKey - Key of the file to download
 * @returns {Promise<string>} - The pre-signed download URL
 */
const getSignedDownloadUrl = async (fileKey) => {
  if (!fileKey) return null;
  const command = new GetObjectCommand({
    Bucket: r2BucketName,
    Key: fileKey,
  });

  // Expire in 300 seconds (5 minutes)
  const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  return url;
};

module.exports = {
  uploadFile,
  deleteFile,
  getSignedDownloadUrl,
};
