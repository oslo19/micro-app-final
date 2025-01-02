const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// User routes
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);

// Get user by UID must come before other parameter routes
router.get('/:uid', userController.getUserByUid);
router.post('/:uid/progress', userController.updateProgress);
router.patch('/:uid/role', userController.updateUserRole);

// Get user by email (moved to end)
router.get('/email/:email', userController.getUserByEmail);

module.exports = router; 