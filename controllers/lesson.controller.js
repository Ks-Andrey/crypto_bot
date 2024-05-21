const path = require('path');


class LessonController {
    constructor(adminRepository){
        this.adminRepository = adminRepository;
    }

    async addLesson(req, res) {
        const { name, text, type_id, points, path} = req.body;

        try {
            const id = await this.adminRepository.addLesson(name, text, type_id, points, path);

            res.json({ userId: id });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getLessons(req, res) {
        try {
            const allLessons = await this.adminRepository.getAllLessons();
            res.json(allLessons);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getLesson(req, res) {
        const lessonId = req.params.id;

        try {
            const lesson = await this.adminRepository.getLessonById(lessonId);
            res.json(lesson);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteLesson(req, res) {
        const { id, is_deleted } = req.body;

        try {
            const status = await this.adminRepository.deleteLesson(id, is_deleted);
            status && res.json({ status });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async uploadPhoto(req, res) {
        const { image } = req.files;

        if (!image) return res.sendStatus(400);

        const path = '/../upload/' + image.name;

        image.mv(__dirname + path);
        
        res.json({ image: path });
    }
}

module.exports = LessonController;
