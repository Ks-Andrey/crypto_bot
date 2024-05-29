class UserController {
    constructor(adminRepository, bot){
        this.adminRepository = adminRepository;
        this.bot = bot;
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

    async getLists(req, res) {
        try {
            const lists = await this.adminRepository.getLists(null);
            res.json(lists);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getListsByUser(req, res) {
        const userId = req.params.id;

        try {
            const lists = await this.adminRepository.getLists(userId);
            res.json(lists);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async addList(req, res) {
        const { name } = req.body;

        try {
            const id = await this.adminRepository.addList(name);
            res.json({ listId: id });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    async addUserToList(req, res) {
        const { userId } = req.body;
        const listId = req.params.id;

        try {
            const isAdd = await this.adminRepository.addUserToList(listId, userId);
            res.json({ status: isAdd })
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async addUsersToList(req, res) {
        const { userIds } = req.body;
        const listId = req.params.id;

        try {
            const isAdd = await this.adminRepository.addUsersToList(listId, userIds);
            res.json({ status: isAdd })
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteUserFromList(req, res) {
        const { userId } = req.body;
        const listId = req.params.id;

        try {
            const isDeleted = await this.adminRepository.deleteUserFromList(listId, userId);
            res.json({ status: isDeleted });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUsersFromList(req, res) {
        const listId = req.params.id;

        try {
            const users = await this.adminRepository.getUsersFromList(listId);
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteList(req, res) {
        const { id } = req.body;

        try {
            const isDeleted = await this.adminRepository.deleteList(id);
            res.json({ status: isDeleted });
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    async broadcastMessage(req, res) {
        const listId = req.params.id;
        const { text } = req.body;

        try {
            const users = await this.adminRepository.getUsersFromList(listId);
            
            if (users.length > 0) {
                users.forEach(({id}) => {
                    this.bot.sendMessage(id, text, { parse_mode: 'HTML' });
                });

                res.json({ status: true });
            }else{
                res.status(403).json({ error: 'There are no users in list' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAllStatistics(req, res) {
        try {
            const statistics = await this.adminRepository.getAllStatistics();
            const topRefs = await this.adminRepository.getTopUsersByRefs(null);
            const topUsers = await this.adminRepository.getTopUsers(null);
            res.json({ statistics, topRefs, topUsers });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UserController;
