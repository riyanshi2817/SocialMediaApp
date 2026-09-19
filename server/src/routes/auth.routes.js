const express = require('express');
const {
    registerController,
    loginController,
    logoutController,
    getCurrentUserController
} = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', registerController);
router.post('/login', loginController);
router.post('/logout', authMiddleware, logoutController);
router.get('/me', authMiddleware, getCurrentUserController);

module.exports = router;