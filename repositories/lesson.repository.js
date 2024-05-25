const { Client } = require('pg');

class LessonRepository {
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

    async addLesson(name, text, type_id, points, path) {
        try {
            const result = await this.client.query('SELECT add_lesson($1, $2, $3, $4, $5)', [name, text, type_id, points, path]);
            return result.rows[0].add_lesson;
        } catch (error) {
            throw error;
        }
    }

    async getAllLessons() {
        try {
            const result = await this.client.query('SELECT * FROM get_all_lessons()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getUserLessons(typeId) {
        try {
            const result = await this.client.query('SELECT * FROM get_user_lessons($1)', [typeId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getLessonById(lessonId) {
        try {
            const result = await this.client.query('SELECT * FROM get_lesson($1)', [lessonId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async deleteLesson(lessonId, is_deleted) {
        try {
            const result = await this.client.query('SELECT delete_lesson($1, $2)', [lessonId, is_deleted]);
            return result.rows[0].delete_lesson;
        } catch (error) {
            throw error;
        }
    }

    async acceptLesson(userId, lessonId){
        try {
            const result = await this.client.query('SELECT accept_lesson($1, $2)', [userId, lessonId]);
            return result.rows[0].accept_lesson;
        } catch (error) {
            throw error;
        }
    }

    async editLesson(lessonId, name, text, path) {
        try {
            const result = await this.client.query('SELECT edit_lesson($1, $2, $3, $4)', [lessonId, name, text, path]);
            return result.rows[0].edit_lesson;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = LessonRepository;
