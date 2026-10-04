const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');
const { allowedMimeTypes } = require('../services/storage.service');
const {
    createPostController,
    getPostsController,
    getFeedController,
    getExploreController,
    getSavedPostsController,
    getPostController,
    setLikeController,
    setSaveController,
    updatePostController,
    deletePostController,
    getSummaryController
} = require('../controllers/post.controller');
const { listComments, addComment, deleteComment } = require('../controllers/comment.controller');

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
router.get('/feed', authMiddleware, getFeedController);
router.get('/explore', authMiddleware, getExploreController);
router.get('/saved', authMiddleware, getSavedPostsController);
router.post('/:id/like', authMiddleware, setLikeController);
router.delete('/:id/like', authMiddleware, setLikeController);
router.post('/:id/save', authMiddleware, setSaveController);
router.delete('/:id/save', authMiddleware, setSaveController);
router.get('/:id/comments', authMiddleware, listComments);
router.post('/:id/comments', authMiddleware, addComment);
router.delete('/:id/comments/:commentId', authMiddleware, deleteComment);
router.get('/:id', authMiddleware, getPostController);
router.patch('/:id', authMiddleware, updatePostController);
router.delete('/:id', authMiddleware, deletePostController);

module.exports = router;
