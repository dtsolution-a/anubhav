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
 * Chat images arrive as base64 data URLs. Storing them in MongoDB made every revision
 * response megabytes big, so move them to Cloudinary and keep only the URL.
 * Falls back to the original value if the upload fails so an image is never lost.
 */
export async function persistImage(imageUrl, folder = 'anubhavah/revisions') {
  if (!imageUrl || !String(imageUrl).startsWith('data:image/')) return { url: imageUrl || null, publicId: null };
  try {
    return await uploadToCloudinary(imageUrl, folder);
  } catch (err) {
    console.error('[cloudinary] upload failed, keeping inline image', err?.message);
    return { url: imageUrl, publicId: null };
  }
}

/**
 * Delete an asset from Cloudinary
 */
export async function deleteFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
