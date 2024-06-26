const { Client } = require('pg');

class TaskRepository {
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

    async getUserTasksRange(userId, limit, offset) {
        try {
            const result = await this.client.query('SELECT *, COUNT(*) OVER () AS total_count FROM get_user_tasks($1) LIMIT $2 OFFSET $3', [userId, limit, offset]);
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

    async getCompletedTasksRange(userId, limit, offset) {
        try {
            const result = await this.client.query('SELECT *, COUNT(*) OVER () AS total_count FROM get_completed_tasks($1) LIMIT $2 OFFSET $3', [userId, limit, offset]);
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

    async editTask(taskId, name, text, points) {
        try {
            const result = await this.client.query('SELECT edit_task($1, $2, $3, $4)', [taskId, name, text, points]);
            return result.rows[0].edit_task;
        } catch (error) {
            throw error;
        }
    }

    async deleteFullTask(taskId) {
        try {
            const result = await this.client.query('SELECT delete_full_task($1)', [taskId]);
            return result.rows[0].delete_full_task;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = TaskRepository;
