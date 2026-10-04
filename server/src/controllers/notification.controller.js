const mongoose = require('mongoose');
const Notification = require('../models/notification.model');

function pageNumber(value) {
    return typeof value === 'string' && /^[1-9]\d*$/.test(value)
        ? Math.min(Number(value), 10000) : 1;
}

function serverError(res, action, error) {
    console.error(`${action} error:`, error.message);
    return res.status(500).json({ success: false, message: `Failed to ${action}.` });
}

async function listNotifications(req, res) {
    try {
        const page = pageNumber(req.query.page);
        const limit = 20;
        const filter = { recipient: req.user._id };
        const [items, total, unreadCount] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit).limit(limit).populate('actor', 'username'),
            Notification.countDocuments(filter),
            Notification.countDocuments({ ...filter, readAt: null })
        ]);
        return res.json({
            success: true,
            notifications: items.map(item => ({
                id: item._id,
                type: item.type,
                actor: item.actor ? { username: item.actor.username } : null,
                postId: item.post || null,
                createdAt: item.createdAt,
                readAt: item.readAt
            })),
            unreadCount,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return serverError(res, 'load notifications', error);
    }
}

async function unreadCount(req, res) {
    try {
        const count = await Notification.countDocuments({ recipient: req.user._id, readAt: null });
        return res.json({ success: true, unreadCount: count });
    } catch (error) {
        return serverError(res, 'count notifications', error);
    }
}

async function markRead(req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id, readAt: null },
            { $set: { readAt: new Date() } },
            { new: true }
        );
        if (!notification) {
            const exists = await Notification.exists({ _id: req.params.id, recipient: req.user._id });
            if (!exists) return res.status(404).json({ success: false, message: 'Notification not found.' });
        }
        return res.json({ success: true });
    } catch (error) {
        return serverError(res, 'mark notification as read', error);
    }
}

async function markAllRead(req, res) {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, readAt: null },
            { $set: { readAt: new Date() } }
        );
        return res.json({ success: true, unreadCount: 0 });
    } catch (error) {
        return serverError(res, 'mark notifications as read', error);
    }
}

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
