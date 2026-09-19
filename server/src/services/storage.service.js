const ImageKit = require("imagekit");

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const maxFileSizeBytes = 5 * 1024 * 1024;

const imagekit = process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT
  ? new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    })
  : null;

function validateUpload(file) {
    if (!file) {
        throw new Error('Image file is required.');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Unsupported image type. Please upload a JPG, PNG, or WEBP image.');
    }

    if (file.size > maxFileSizeBytes) {
        throw new Error('Image size exceeds the 5MB limit.');
    }
}

async function uploadFile(file, fileName) {
    validateUpload(file);

    if (!imagekit) {
        throw new Error('ImageKit credentials are missing. Add IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT to your environment.');
    }

    const response = await imagekit.upload({
        file: file.buffer || file,
        fileName: fileName,
        folder: 'cohort-ai-social'
    });

    return response;
}

async function deleteFile(fileId) {
    if (!imagekit || !fileId) {
        return;
    }

    await imagekit.deleteFile(fileId);
}

module.exports = {
    uploadFile,
    deleteFile,
    allowedMimeTypes,
    maxFileSizeBytes
};