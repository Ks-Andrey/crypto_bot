require('dotenv').config();
const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/task.controller');
const { adminTaskRepository } = require('../repositories/index');

const taskController = new TaskController(adminTaskRepository);

router.get('/tasks', taskController.getTasks.bind(taskController));
router.get('/task/:id', taskController.getTask.bind(taskController));
router.post('/tasks/add', taskController.addTask.bind(taskController));
router.post('/tasks/delete', taskController.deleteTask.bind(taskController));
router.get('/tasks/completed/:id', taskController.getCompletedTasks.bind(taskController));
router.get('/task/:id/users', taskController.getTaskUsers.bind(taskController));
router.put('/task/:id', taskController.editTask.bind(taskController));
router.delete('/tasks/delete', taskController.deleteFullTask.bind(taskController));

module.exports = router;
