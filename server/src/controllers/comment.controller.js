const mongoose = require('mongoose');
const Comment = require('../models/comment.model');
const Post = require('../models/post.model');
const { notify } = require('../services/notification.service');

function serializeComment(comment, viewerId) {
    return {
        id: comment._id,
        text: comment.text,
        createdAt: comment.createdAt,
        user: comment.user ? { username: comment.user.username } : null,
        isOwn: Boolean(comment.user && String(comment.user._id) === String(viewerId))
    };
}

function validId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

async function listComments(req, res) {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    try {
        if (!await Post.exists({ _id: req.params.id })) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }
        const page = typeof req.query.page === 'string' && /^[1-9]\d*$/.test(req.query.page)
            ? Math.min(Number(req.query.page), 10000) : 1;
        const limit = 20;
        const [comments, total] = await Promise.all([
            Comment.find({ post: req.params.id }).sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit).limit(limit).populate('user', 'username'),
            Comment.countDocuments({ post: req.params.id })
        ]);
        return res.json({
            success: true,
            comments: comments.map(comment => serializeComment(comment, req.user._id)),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('listComments error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to load comments.' });
    }
}

async function addComment(req, res) {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 500) {
        return res.status(400).json({ success: false, message: 'Comment must be 1 to 500 characters.' });
    }
    try {
        const post = await Post.findById(req.params.id).select('user');
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }
        const comment = await Comment.create({ post: req.params.id, user: req.user._id, text });
        const commentCount = await Comment.countDocuments({ post: req.params.id });
        await notify({ recipient: post.user, actor: req.user._id, type: 'comment', post: post._id });
        return res.status(201).json({
            success: true,
            comment: { id: comment._id, text: comment.text, createdAt: comment.createdAt,
                user: { username: req.user.username }, isOwn: true },
            commentCount
        });
    } catch (error) {
        console.error('addComment error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to add comment.' });
    }
}

async function deleteComment(req, res) {
    if (!validId(req.params.id) || !validId(req.params.commentId)) {
        return res.status(400).json({ success: false, message: 'Invalid post or comment ID.' });
    }
    try {
        const deleted = await Comment.findOneAndDelete({
            _id: req.params.commentId,
            post: req.params.id,
            user: req.user._id
        });
        if (!deleted) return res.status(404).json({ success: false, message: 'Comment not found.' });
        const commentCount = await Comment.countDocuments({ post: req.params.id });
        return res.json({ success: true, commentCount });
    } catch (error) {
        console.error('deleteComment error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete comment.' });
    }
}

module.exports = { listComments, addComment, deleteComment };
