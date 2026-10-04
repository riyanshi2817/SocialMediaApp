const postModel = require('../models/post.model');
const mongoose = require('mongoose');
const { generateCaption } = require('../services/ai.service');
const { uploadFile, deleteFile } = require('../services/storage.service');
const { v4: uuidv4 } = require('uuid');
const Comment = require('../models/comment.model');
const Notification = require('../models/notification.model');
const SavedPost = require('../models/saved-post.model');
const { notify } = require('../services/notification.service');

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

function serializePost(post, viewerId, isSaved = false) {
    return {
        id: post._id,
        imageUrl: post.imageUrl,
        caption: post.caption,
        style: post.style,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likeCount: (post.likes || []).length,
        isLiked: Boolean(viewerId && (post.likes || []).some(id => String(id) === String(viewerId))),
        isSaved,
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
                likeCount: 0,
                isLiked: false,
                isSaved: false,
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
            .select('+likes')
            .populate('user', 'username'),
            postModel.countDocuments(filter)
        ]);
        const savedPosts = await SavedPost.find({
            user: req.user._id,
            post: { $in: posts.map(post => post._id) }
        }).select('post').lean();
        const savedPostIds = new Set(savedPosts.map(item => String(item.post)));

        return res.status(200).json({
            success: true,
            posts: posts.map(post => serializePost(post, req.user._id, savedPostIds.has(String(post._id)))),
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

async function getFeedController(req, res) {
    try {
        const { page, limit } = getPagination(req.query);
        const following = req.user.following || [];
        if (!following.length) {
            return res.status(200).json({
                success: true,
                posts: [],
                pagination: { page, limit, total: 0, pages: 0 }
            });
        }

        const filter = { user: { $in: following } };
        const [posts, total] = await Promise.all([
            postModel.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select('+likes')
                .populate('user', 'username'),
            postModel.countDocuments(filter)
        ]);

        const [commentCounts, savedPosts] = await Promise.all([
            posts.length ? Comment.aggregate([
                { $match: { post: { $in: posts.map(post => post._id) } } },
                { $group: { _id: '$post', count: { $sum: 1 } } }
            ]) : [],
            SavedPost.find({ user: req.user._id, post: { $in: posts.map(post => post._id) } }).select('post').lean()
        ]);
        const countByPost = new Map(commentCounts.map(item => [String(item._id), item.count]));
        const savedPostIds = new Set(savedPosts.map(item => String(item.post)));

        return res.status(200).json({
            success: true,
            posts: posts.map(post => ({
                id: post._id,
                imageUrl: post.imageUrl,
                caption: post.caption,
                style: post.style,
                createdAt: post.createdAt,
                likeCount: (post.likes || []).length,
                isLiked: (post.likes || []).some(id => String(id) === String(req.user._id)),
                isSaved: savedPostIds.has(String(post._id)),
                commentCount: countByPost.get(String(post._id)) || 0,
                author: post.user ? { username: post.user.username } : null
            })),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('getFeedController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch feed.' });
    }
}

async function getExploreController(req, res) {
    try {
        const { page, limit } = getPagination(req.query);
        const sort = req.query.sort === 'popular' ? 'popular' : 'newest';
        const filter = { user: { $nin: [req.user._id, ...(req.user.following || [])] } };
        const skip = (page - 1) * limit;
        const postQuery = sort === 'popular'
            ? postModel.aggregate([
                { $match: filter },
                { $project: { createdAt: 1, likeCount: { $size: { $ifNull: ['$likes', []] } } } },
                { $sort: { likeCount: -1, createdAt: -1, _id: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]).then(async ranked => {
                const posts = await postModel.find({ _id: { $in: ranked.map(item => item._id) } })
                    .select('+likes').populate('user', 'username');
                const byId = new Map(posts.map(post => [String(post._id), post]));
                return ranked.map(item => byId.get(String(item._id))).filter(Boolean);
            })
            : postModel.find(filter).sort({ createdAt: -1, _id: -1 })
                .skip(skip).limit(limit).select('+likes').populate('user', 'username');

        const [posts, total] = await Promise.all([postQuery, postModel.countDocuments(filter)]);
        const postIds = posts.map(post => post._id);
        const [commentCounts, savedPosts] = await Promise.all([
            postIds.length ? Comment.aggregate([
                { $match: { post: { $in: postIds } } },
                { $group: { _id: '$post', count: { $sum: 1 } } }
            ]) : [],
            SavedPost.find({ user: req.user._id, post: { $in: postIds } }).select('post').lean()
        ]);
        const countByPost = new Map(commentCounts.map(item => [String(item._id), item.count]));
        const savedPostIds = new Set(savedPosts.map(item => String(item.post)));

        return res.json({
            success: true,
            posts: posts.map(post => ({
                ...serializePost(post, req.user._id, savedPostIds.has(String(post._id))),
                commentCount: countByPost.get(String(post._id)) || 0
            })),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            sort
        });
    } catch (error) {
        console.error('getExploreController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch explore posts.' });
    }
}

async function getPostController(req, res) {
    if (!isValidPostId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    try {
        const post = await postModel.findById(req.params.id).select('+likes').populate('user', 'username');

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const [commentCount, savedPost] = await Promise.all([
            Comment.countDocuments({ post: post._id }),
            SavedPost.exists({ user: req.user._id, post: post._id })
        ]);
        return res.status(200).json({
            success: true,
            post: { ...serializePost(post, req.user._id, Boolean(savedPost)), commentCount }
        });
    } catch (error) {
        console.error('getPostController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch post.' });
    }
}

async function getSavedPostsController(req, res) {
    try {
        const { page, limit } = getPagination(req.query);
        const filter = { user: req.user._id };
        const [saves, total] = await Promise.all([
            SavedPost.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate({ path: 'post', select: '+likes', populate: { path: 'user', select: 'username' } }),
            SavedPost.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            posts: saves.filter(save => save.post).map(save => ({
                ...serializePost(save.post, req.user._id, true),
                savedAt: save.createdAt
            })),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('getSavedPostsController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch saved posts.' });
    }
}

async function setSaveController(req, res) {
    if (!isValidPostId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    try {
        if (req.method === 'POST') {
            const post = await postModel.exists({ _id: req.params.id });
            if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

            try {
                await SavedPost.updateOne(
                    { user: req.user._id, post: post._id },
                    { $setOnInsert: { user: req.user._id, post: post._id } },
                    { upsert: true }
                );
            } catch (error) {
                if (error.code !== 11000) throw error;
            }
            return res.status(200).json({ success: true, isSaved: true });
        }

        await SavedPost.deleteOne({ user: req.user._id, post: req.params.id });
        return res.status(200).json({ success: true, isSaved: false });
    } catch (error) {
        console.error('setSaveController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update saved post.' });
    }
}

async function setLikeController(req, res) {
    if (!isValidPostId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    try {
        let post;
        let newlyLiked = false;
        if (req.method === 'POST') {
            post = await postModel.findOneAndUpdate(
                { _id: req.params.id, likes: { $ne: req.user._id } },
                { $addToSet: { likes: req.user._id } },
                { new: true }
            ).select('+likes');
            newlyLiked = Boolean(post);
            if (!post) post = await postModel.findById(req.params.id).select('+likes');
        } else {
            post = await postModel.findByIdAndUpdate(
                req.params.id, { $pull: { likes: req.user._id } }, { new: true }
            ).select('+likes');
        }
        if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

        if (newlyLiked) {
            await notify({ recipient: post.user, actor: req.user._id, type: 'like', post: post._id });
        }
        const likes = post.likes || [];
        return res.status(200).json({
            success: true,
            likeCount: likes.length,
            isLiked: likes.some(id => String(id) === String(req.user._id))
        });
    } catch (error) {
        console.error('setLikeController error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update like.' });
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
        ).select('+likes').populate('user', 'username');

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const savedPost = await SavedPost.exists({ user: req.user._id, post: post._id });
        return res.status(200).json({
            success: true,
            message: 'Post updated successfully',
            post: serializePost(post, req.user._id, Boolean(savedPost))
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

        if (post.imageFileId) {
            try {
                await deleteFile(post.imageFileId);
            } catch (cleanupError) {
                console.error('Image cleanup error:', cleanupError.message);
            }
        }

        try {
            await Comment.deleteMany({ post: post._id });
        } catch (cleanupError) {
            console.error('Comment cleanup error:', cleanupError.message);
        }
        try {
            await Notification.deleteMany({ post: post._id });
        } catch (cleanupError) {
            console.error('Notification cleanup error:', cleanupError.message);
        }
        try {
            await SavedPost.deleteMany({ post: post._id });
        } catch (cleanupError) {
            console.error('Saved post cleanup error:', cleanupError.message);
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
    getFeedController,
    getExploreController,
    getSavedPostsController,
    getPostController,
    setLikeController,
    setSaveController,
    updatePostController,
    deletePostController,
    getSummaryController
};
