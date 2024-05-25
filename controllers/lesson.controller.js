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
        const { image } = req.files || {};
    
        if (!image) {
            return res.json({ image: '' });
        }
    
        const path = '/../upload/' + image.name;
    
        try {
            await image.mv(__dirname + path);
            res.json({ image: path });
        } catch (error) {
            res.sendStatus(500);
        }
    }
    
    async editLesson(req, res) {
        const id = req.params.id;
        const { name, text, photo_path } = req.body;

        try {
            const isEdited = await this.adminRepository.editLesson(id, name, text, photo_path);
            res.json({ status: isEdited });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = LessonController;
