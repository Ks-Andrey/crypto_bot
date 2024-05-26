class TaskController {
    constructor(adminRepository){
        this.adminRepository = adminRepository;
    }

    async addTask(req, res) {
        const { name, text, points } = req.body;
        
        try {
            const id = await this.adminRepository.addTask(name, text, points);

            res.json({ userId: id });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTasks(req, res) {
        try {
            const allTasks = await this.adminRepository.getAllTasks();
            res.json(allTasks);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTask(req, res) {
        const taskId = req.params.id;

        try {
            const task = await this.adminRepository.getTaskById(taskId);
            res.json(task);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteTask(req, res) {
        const { id, is_deleted } = req.body;

        try {
            const status = await this.adminRepository.deleteTask(id, is_deleted);
            status && res.json({ status });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getCompletedTasks(req, res) {
        const userId = req.params.id;
        
        try {
            const tasks = await this.adminRepository.getCompletedTasks(userId);
            res.json(tasks);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTaskUsers(req, res) {
        const taskId = req.params.id;

        try {
            const users = await this.adminRepository.getTaskUsersById(taskId);
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async editTask(req, res) {
        const id = req.params.id;
        const { name, text, points } = req.body;

        try {
            const isEdited = await this.adminRepository.editTask(id, name, text, points);
            res.json({ status: isEdited });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteFullTask(req, res) {
        const { id } = req.body;

        try {
            const isDeleted = await this.adminRepository.deleteFullTask(id);
            res.json({ status: isDeleted });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = TaskController;
