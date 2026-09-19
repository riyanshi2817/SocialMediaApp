const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');
const { allowedMimeTypes } = require('../services/storage.service');
const {
    createPostController,
    getPostsController,
    getPostController,
    updatePostController,
    deletePostController,
    getSummaryController
} = require('../controllers/post.controller');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(new Error('Unsupported image type. Please upload a JPG, PNG, or WEBP image.'));
        }
        callback(null, true);
    }
});

router.get('/', authMiddleware, getPostsController);
router.post('/', authMiddleware, upload.single('image'), createPostController);
router.get('/summary', authMiddleware, getSummaryController);
router.get('/:id', authMiddleware, getPostController);
router.patch('/:id', authMiddleware, updatePostController);
router.delete('/:id', authMiddleware, deletePostController);

module.exports = router;