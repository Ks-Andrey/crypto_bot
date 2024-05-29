require('dotenv').config();
const UserRepository = require('../repositories/user.repository');
const TaskRepository = require('../repositories/task.repository');
const LessonRepository = require('../repositories/lesson.repository');
const adminId = process.env.ADMIN_ID;

const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbUserPassword = process.env.DB_USER_PASSWORD;
const dbName = process.env.DB_NAME;
const dbAdmin = process.env.DB_ADMIN;
const dbAdminPassword = process.env.DB_ADMIN_PASSWORD;

const userRepository = new UserRepository(dbUser, dbHost, dbName, dbUserPassword, adminId);
const taskRepository = new TaskRepository(dbUser, dbHost, dbName, dbUserPassword);
const lessonRepository = new LessonRepository(dbUser, dbHost, dbName, dbUserPassword);

const adminUserRepository = new UserRepository(dbAdmin, dbHost, dbName, dbAdminPassword, adminId);
const adminTaskRepository = new TaskRepository(dbAdmin, dbHost, dbName, dbAdminPassword);
const adminLessonRepository = new LessonRepository(dbAdmin, dbHost, dbName, dbAdminPassword);

module.exports = { userRepository, taskRepository, lessonRepository, adminUserRepository, adminTaskRepository, adminLessonRepository }