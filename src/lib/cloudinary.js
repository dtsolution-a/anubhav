import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a base64 or remote URL to Cloudinary
 * @param {string} source - base64 data URI or remote URL
 * @param {string} folder - Cloudinary folder
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadToCloudinary(source, folder = 'anubhavah') {
  const result = await cloudinary.uploader.upload(source, {
    folder,
    resource_type: 'auto',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

/**
 * Delete an asset from Cloudinary
 */
export async function deleteFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
