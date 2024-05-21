require('dotenv').config();
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { adminUserRepository } = require('../repositories/index');

const userController = new UserController(adminUserRepository);

router.get('/users', userController.getUsers.bind(userController));
router.get('/user/:id', userController.getUser.bind(userController));
router.get('/users/search', userController.searchUsers.bind(userController));
router.get('/user/:id/referrals', userController.getUserReferrals.bind(userController));
router.get('/wallets', userController.getWallets.bind(userController));
router.post('/auth', userController.authAdmin.bind(userController));

module.exports = router;
