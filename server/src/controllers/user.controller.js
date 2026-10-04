const User = require('../models/user.model');
const Post = require('../models/post.model');
const { notify } = require('../services/notification.service');

function pageNumber(value) {
    return typeof value === 'string' && /^[1-9]\d*$/.test(value)
        ? Math.min(Number(value), 10000)
        : 1;
}

function serverError(res, action, error) {
    console.error(`${action} error:`, error.message);
    return res.status(500).json({ success: false, message: `Failed to ${action}.` });
}

async function getProfile(req, res) {
    try {
        const user = await User.findOne({ username: req.params.username }).select('_id username following');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const page = pageNumber(req.query.page);
        const limit = 12;
        const [posts, postCount, followerCount, followingCount] = await Promise.all([
            Post.find({ user: user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
                .select('imageUrl caption style createdAt +likes').lean(),
            Post.countDocuments({ user: user._id }),
            User.countDocuments({ following: user._id }),
            User.countDocuments({ _id: { $in: user.following || [] } })
        ]);

        return res.json({
            success: true,
            profile: { id: user._id, username: user.username, postCount, followerCount, followingCount },
            posts: posts.map(post => ({
                id: post._id,
                imageUrl: post.imageUrl,
                caption: post.caption,
                style: post.style,
                createdAt: post.createdAt,
                likeCount: (post.likes || []).length,
                isLiked: Boolean(req.user && (post.likes || []).some(id => String(id) === String(req.user._id)))
            })),
            pagination: { page, pages: Math.ceil(postCount / limit) }
        });
    } catch (error) {
        return serverError(res, 'load profile', error);
    }
}

async function listConnections(req, res) {
    if (!['followers', 'following'].includes(req.params.kind)) {
        return res.status(404).json({ success: false, message: 'List not found.' });
    }
    try {
        const user = await User.findOne({ username: req.params.username }).select('_id following');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const kind = req.params.kind;
        const filter = kind === 'followers'
            ? { following: user._id }
            : { _id: { $in: user.following || [] } };
        const page = pageNumber(req.query.page);
        const limit = 50;
        const [users, total] = await Promise.all([
            User.find(filter).select('_id username').sort({ username: 1 }).skip((page - 1) * limit).limit(limit).lean(),
            User.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            users: users.map(person => ({ id: person._id, username: person.username })),
            pagination: { page, pages: Math.ceil(total / limit), total }
        });
    } catch (error) {
        return serverError(res, 'load connections', error);
    }
}

async function getFollowState(req, res) {
    try {
        const target = await User.findOne({ username: req.params.username }).select('_id');
        if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

        return res.json({
            success: true,
            isFollowing: (req.user.following || []).some(id => String(id) === String(target._id))
        });
    } catch (error) {
        return serverError(res, 'load follow state', error);
    }
}

async function getSuggestions(req, res) {
    try {
        const excluded = [req.user._id, ...(req.user.following || [])];
        const users = await User.find({ _id: { $nin: excluded } })
            .select('_id username')
            .sort({ createdAt: -1, _id: -1 })
            .limit(6)
            .lean();
        return res.json({
            success: true,
            users: users.map(user => ({ id: user._id, username: user.username }))
        });
    } catch (error) {
        return serverError(res, 'load suggestions', error);
    }
}

async function searchUsers(req, res) {
    const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const page = pageNumber(req.query.page);
    if (!query) return res.json({ success: true, users: [], pagination: { page: 1, pages: 0, total: 0 } });

    try {
        const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filter = {
            _id: { $ne: req.user._id },
            $or: [
                { username: { $regex: pattern, $options: 'i' } },
                { name: { $regex: pattern, $options: 'i' } }
            ]
        };
        const limit = 20;
        const [users, total] = await Promise.all([
            User.find(filter).select('_id username name').sort({ username: 1, _id: 1 })
                .skip((page - 1) * limit).limit(limit).lean(),
            User.countDocuments(filter)
        ]);
        const following = new Set((req.user.following || []).map(String));
        return res.json({
            success: true,
            users: users.map(user => ({
                id: user._id,
                username: user.username,
                name: user.name || '',
                isFollowing: following.has(String(user._id))
            })),
            pagination: { page, pages: Math.ceil(total / limit), total }
        });
    } catch (error) {
        return serverError(res, 'search users', error);
    }
}

async function followUser(req, res) {
    try {
        const target = await User.findOne({ username: req.params.username }).select('_id');
        if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
        if (String(target._id) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
        }

        const result = await User.updateOne(
            { _id: req.user._id, following: { $ne: target._id } },
            { $addToSet: { following: target._id } }
        );
        if (result.modifiedCount) {
            await notify({ recipient: target._id, actor: req.user._id, type: 'follow' });
        }
        return res.json({ success: true, isFollowing: true });
    } catch (error) {
        return serverError(res, 'follow user', error);
    }
}

async function unfollowUser(req, res) {
    try {
        const target = await User.findOne({ username: req.params.username }).select('_id');
        if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
        if (String(target._id) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You cannot unfollow yourself.' });
        }

        await User.updateOne({ _id: req.user._id }, { $pull: { following: target._id } });
        return res.json({ success: true, isFollowing: false });
    } catch (error) {
        return serverError(res, 'unfollow user', error);
    }
}

module.exports = { getProfile, listConnections, getFollowState, followUser, unfollowUser, getSuggestions, searchUsers };
