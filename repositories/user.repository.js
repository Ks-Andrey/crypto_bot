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
    
    async getTopUsers(userId) {
        try {
            const result = await this.client.query('SELECT * FROM get_top_users($1)', [userId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserRepository;
