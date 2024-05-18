require('dotenv').config();
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const UserRepository = require('../repositories/user.repository');

const dbHost = process.env.DB_HOST;
const dbAdmin = process.env.DB_ADMIN;
const dbAdminPassword = process.env.DB_ADMIN_PASSWORD;
const dbName = process.env.DB_NAME;

const adminRepository = new UserRepository(dbAdmin, dbHost, dbName, dbAdminPassword);
const userController = new UserController(adminRepository);

//users
//--------------
router.get('/users', userController.getUsers.bind(userController));
router.get('/user/:id', userController.getUser.bind(userController));
router.get('/users/search', userController.searchUsers.bind(userController));
router.get('/user/:id/referrals', userController.getUserReferrals.bind(userController));
router.get('/wallets', userController.getWallets.bind(userController));
router.post('/auth', userController.authAdmin.bind(userController));

//tasks
//----------------
router.get('/tasks', userController.getTasks.bind(userController));
router.get('/task/:id', userController.getTask.bind(userController));
router.post('/tasks/add', userController.addTask.bind(userController));
router.post('/tasks/delete', userController.deleteTask.bind(userController));
router.get('/tasks/completed/:id', userController.getCompletedTasks.bind(userController));
router.get('/task/:id/users', userController.getTaskUsers.bind(userController))

module.exports = router;
