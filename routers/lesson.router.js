require('dotenv').config();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const express = require('express');
const LessonController = require('../controllers/lesson.controller');
const { adminLessonRepository } = require('../repositories/index');
const router = express.Router();

const lessonController = new LessonController(adminLessonRepository);

router.get('/lessons', lessonController.getLessons.bind(lessonController));
router.get('/lesson/:id', lessonController.getLesson.bind(lessonController));
router.post('/lessons/add', lessonController.addLesson.bind(lessonController));
router.post('/lessons/delete', lessonController.deleteLesson.bind(lessonController));
router.post('/lessons/photo', lessonController.uploadPhoto.bind(lessonController));
router.put('/lesson/:id', lessonController.editLesson.bind(lessonController))

module.exports = router;
