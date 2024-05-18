const { Client } = require('pg');

class UserRepository {
    constructor(user, host, database, password) {
        this.client = new Client({
            user,
            host,
            database,
            password,
            port: 5432,
            client_encoding: 'UTF8'
        });
        this.client.connect();
    }

    async getAllUsers() {
        try {
            const result = await this.client.query('SELECT * FROM get_all_users()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getWallets() {
        try {
            const result = await this.client.query('SELECT * FROM get_wallets()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async searchUsers(query) {
        try {
            const result = await this.client.query('SELECT * FROM search_users($1)', [query]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const result = await this.client.query('SELECT * FROM get_user($1)', [userId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getUsersByWallet(wallet) {
        try {
            const result = await this.client.query('SELECT * FROM get_users_by_wallet($1)', [wallet]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getUserReferrals(userId) {
        try {
            const result = await this.client.query('SELECT * FROM get_user_referrals($1)', [userId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async updateUserWallet(userId, newWallet) {
        try {
            const result = await this.client.query('SELECT update_user_wallet($1, $2)', [userId, newWallet]);
            return result.rows[0].update_user_wallet;
        } catch (error) {
            throw error;
        }
    }

    async addUser(userId, name, wallet, refId = 0) {
        try {
            const result = await this.client.query('SELECT add_user($1, $2, $3, $4)', [userId, name, wallet, refId]);
            return result.rows[0].add_user;
        } catch (error) {
            throw error;
        }
    }

    async authAdmin(login, password) {
        try {
            const result = await this.client.query('SELECT auth_admin($1, $2)', [login, password]);
            return result.rows[0].auth_admin;
        } catch (error) {
            throw error;
        }
    }



    //tasks
    //------------------------------------
    async addTask(name, text, points) {
        try {
            const result = await this.client.query('SELECT add_task($1, $2, $3)', [name, text, points]);
            return result.rows[0].add_user;
        } catch (error) {
            throw error;
        }
    }

    async getAllTasks() {
        try {
            const result = await this.client.query('SELECT * FROM get_all_tasks()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getUserTasks(userId) {
        try {
            const result = await this.client.query('SELECT * FROM get_user_tasks($1)', [userId]);
            return result.rows;
        } catch (error) {
            throw error;   
        }
    }

    async getTaskById(taskId) {
        try {
            const result = await this.client.query('SELECT * FROM get_task($1)', [taskId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async deleteTask(taskId, is_deleted) {
        try {
            const result = await this.client.query('SELECT delete_task($1, $2)', [taskId, is_deleted]);
            return result.rows[0].delete_task;
        } catch (error) {
            throw error;
        }
    }

    async getCompletedTasks(userId){
        try {
            const result = await this.client.query('SELECT * FROM get_completed_tasks($1)', [userId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async acceptTask(userId, taskId) {
        try {
            const result = await this.client.query('SELECT accept_task($1, $2)', [userId, taskId]);
            return result.rows[0].accept_task;
        } catch (error) {
            throw error;
        }
    }

    async getTaskUsersById(taskId) {
        try {
            const result = await this.client.query('SELECT * FROM get_task_users($1)', [taskId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserRepository;
