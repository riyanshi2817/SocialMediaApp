const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { getProfile, listConnections, getFollowState, followUser, unfollowUser, getSuggestions, searchUsers } = require('../controllers/user.controller');

const router = express.Router();

router.get('/suggestions', authMiddleware, getSuggestions);
router.get('/search', authMiddleware, searchUsers);
router.get('/:username', authMiddleware.optional, getProfile);
router.get('/:username/follow-state', authMiddleware, getFollowState);
router.get('/:username/:kind', listConnections);
router.post('/:username/follow', authMiddleware, followUser);
router.delete('/:username/follow', authMiddleware, unfollowUser);

module.exports = router;
