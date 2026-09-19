const postModel = require('../models/post.model');
const mongoose = require('mongoose');
const { generateCaption } = require('../services/ai.service');
const { uploadFile, deleteFile } = require('../services/storage.service');
const { v4: uuidv4 } = require('uuid');

const defaultPage = 1;
const defaultLimit = 10;
const maxLimit = 50;
const maxPage = 10000;
const allowedTones = ['creative', 'professional', 'energetic', 'minimal'];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPagination(query) {
    const parsedPage = /^\d+$/.test(query.page || '') ? Number(query.page) : defaultPage;
    const parsedLimit = /^\d+$/.test(query.limit || '') ? Number(query.limit) : defaultLimit;

    return {
        page: Number.isInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, maxPage) : defaultPage,
        limit: Number.isInteger(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, maxLimit)
            : defaultLimit
    };
}

function isValidPostId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

function serializePost(post) {
    return {
        id: post._id,
        imageUrl: post.imageUrl,
        caption: post.caption,
        style: post.style,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        user: post.user && {
            id: post.user._id,
            username: post.user.username
        }
    };
}

async function createPostController(req, res) {
    let uploadedFile;
    try {
        const file = req.file;
        const tone = req.body?.tone || 'creative';

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Image file is required.'
            });
        }

        if (!allowedTones.includes(tone)) {
            return res.status(400).json({ success: false, message: 'Invalid caption style.' });
        }

        const base64Image = Buffer.from(file.buffer).toString('base64');
        const caption = await generateCaption(base64Image, file.mimetype, tone);

        if (!caption || caption.length > 500) {
            return res.status(502).json({ success: false, message: 'Caption generation returned an unusable result.' });
        }

        uploadedFile = await uploadFile(file, `${uuidv4()}`);

        const post = await postModel.create({
            imageUrl: uploadedFile.url,
            imageFileId: uploadedFile.fileId,
            caption,
            style: tone,
            user: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: {
                id: post._id,
                imageUrl: post.imageUrl,
                caption: post.caption,
                style: post.style,
                createdAt: post.createdAt,
                user: {
                    id: req.user._id,
                    username: req.user.username
                }
            }
        });
    } catch (error) {
        if (uploadedFile?.fileId) {
            try {
                await deleteFile(uploadedFile.fileId);
            } catch (cleanupError) {
                console.error('Image cleanup error:', cleanupError.message);
            }
        }
        console.error('createPostController error:', error.message);
        const isExternalFailure = /imagekit|gemini|credentials are missing|generativelanguage/i.test(error.message);
        const isValidationFailure = error.name === 'ValidationError' || /image file is required|unsupported image|invalid caption style/i.test(error.message);
        const statusCode = isExternalFailure ? 502 : isValidationFailure ? 400 : 500;
        const message = isExternalFailure
            ? 'An external caption or image service is temporarily unavailable.'
            : 'Failed to create post.';
        return res.status(statusCode).json({
            success: false,
            message
        });
    }
}

async function getPostsController(req, res) {
    try {
        const { page, limit } = getPagination(req.query);
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const filter = { user: req.user._id };

        if (search) {
            filter.caption = { $regex: escapeRegex(search.slice(0, 100)), $options: 'i' };
        }

        const [posts, total] = await Promise.all([
            postModel.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate('user', 'username'),
            postModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            posts: posts.map(serializePost),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('getPostsController error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch posts'
        });
    }
}

async function getPostController(req, res) {
    if (!isValidPostId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    try {
        const post = await postModel.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('user', 'username');

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        return res.status(200).json({ success: true, post: serializePost(post) });
    } catch (error) {
        console.error('getPostController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch post.' });
    }
}

async function updatePostController(req, res) {
    if (!isValidPostId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim() : '';
    if (!caption || caption.length > 500) {
        return res.status(400).json({
            success: false,
            message: 'Caption is required and must be 500 characters or fewer.'
        });
    }

    try {
        const post = await postModel.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { $set: { caption } },
            { new: true, runValidators: true }
        ).populate('user', 'username');

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        if (post.imageFileId) {
            try {
                await deleteFile(post.imageFileId);
            } catch (cleanupError) {
                console.error('Image cleanup error:', cleanupError.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Post updated successfully',
            post: serializePost(post)
        });
    } catch (error) {
        console.error('updatePostController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update post.' });
    }
}

async function deletePostController(req, res) {
    if (!isValidPostId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    try {
        const post = await postModel.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        }).select('+imageFileId');

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('deletePostController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete post.' });
    }
}

async function getSummaryController(req, res) {
    try {
        const [total, latestPost] = await Promise.all([
            postModel.countDocuments({ user: req.user._id }),
            postModel.findOne({ user: req.user._id }).sort({ createdAt: -1 }).select('createdAt')
        ]);

        return res.status(200).json({
            success: true,
            summary: {
                totalPosts: total,
                latestPostDate: latestPost?.createdAt || null
            }
        });
    } catch (error) {
        console.error('getSummaryController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch post summary.' });
    }
}

module.exports = {
    createPostController,
    getPostsController,
    getPostController,
    updatePostController,
    deletePostController,
    getSummaryController
};