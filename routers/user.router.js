require('dotenv').config();
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { adminUserRepository } = require('../repositories/index');
const bot = require('../utils/bot');

const userController = new UserController(adminUserRepository, bot);

router.get('/users', userController.getUsers.bind(userController));
router.get('/user/:id', userController.getUser.bind(userController));
router.get('/users/search', userController.searchUsers.bind(userController));
router.get('/user/:id/referrals', userController.getUserReferrals.bind(userController));
router.get('/wallets', userController.getWallets.bind(userController));
router.post('/auth', userController.authAdmin.bind(userController));

router.get('/lists', userController.getLists.bind(userController));
router.get('/lists/user/:id', userController.getListsByUser.bind(userController));
router.post('/lists/add', userController.addList.bind(userController));
router.delete('/lists/delete', userController.deleteList.bind(userController));
router.post('/list/:id/add', userController.addUserToList.bind(userController));
router.post('/list/:id/delete', userController.deleteUserFromList.bind(userController));
router.get('/list/:id', userController.getUsersFromList.bind(userController));
router.post('/list/:id/broadcast', userController.broadcastMessage.bind(userController));
router.post('/list/:id/add_list', userController.addUsersToList.bind(userController));

router.get('/statistics', userController.getAllStatistics.bind(userController));

module.exports = router;
