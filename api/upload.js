import { uploadToCloudinary } from './_lib/cloudinary.js';
import { requireAuth } from './_lib/auth.js';
import { successResponse, errorResponse } from './_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, 'Method not allowed', 405);
  }

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { file, folder = 'chat_app', fileName, fileType } = req.body;

    if (!file) {
      return errorResponse(res, 'File data is required', 400);
    }

    const secureUrl = await uploadToCloudinary(file, folder);

    return successResponse(res, {
      url: secureUrl,
      fileName: fileName || 'attachment',
      fileType: fileType || 'image',
    }, 'File uploaded successfully');

  } catch (err) {
    console.error('Upload Endpoint Error:', err);
    return errorResponse(res, err.message || 'Error uploading file', 500);
  }
}
