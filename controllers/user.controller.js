class UserController {
    constructor(adminRepository){
        this.adminRepository = adminRepository;
    }

    async getUsers(req, res) {
        try {
            const allUsers = await this.adminRepository.getAllUsers();
            res.json(allUsers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getWallets(req, res) {
        try {
            const allWallets = await this.adminRepository.getWallets();
            res.json(allWallets);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUser(req, res) {
        const userId = req.params.id;
        try {
            const user = await this.adminRepository.getUserById(userId);
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async searchUsers(req, res) {
        const name = req.query.query;
        try {
            const users = await this.adminRepository.searchUsers(name);
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUserReferrals(req, res) {
        const userId = req.params.id;
        try {
            const referrals = await this.adminRepository.getUserReferrals(userId);
            res.json(referrals);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async authAdmin(req, res) {
        const {login, password} = req.body;

        try {
            const isAdmin = await this.adminRepository.authAdmin(login, password);

            isAdmin && res.json({ isAdmin });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }


    //tasks
    //-------------------------------
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
        const taskId= req.params.id;

        try {
            const users = await this.adminRepository.getTaskUsersById(taskId);
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UserController;
