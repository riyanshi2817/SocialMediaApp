const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { listNotifications, unreadCount, markRead, markAllRead } = require('../controllers/notification.controller');

const router = express.Router();
router.use(authMiddleware);
router.get('/', listNotifications);
router.get('/unread-count', unreadCount);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

module.exports = router;
