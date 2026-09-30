import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadToCloudinary(fileString, folder = 'chat_app') {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.log(`⚠️ Cloudinary credentials missing. Returning base64/mock media URL.`);
      return fileString.startsWith('data:') ? fileString : `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60`;
    }

    const res = await cloudinary.uploader.upload(fileString, {
      folder,
      resource_type: 'auto',
    });
    return res.secure_url;
  } catch (err) {
    console.error('❌ Cloudinary Upload Error:', err.message);
    throw err;
  }
}

export default cloudinary;
