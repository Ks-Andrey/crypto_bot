const { Client } = require('pg');

class UserRepository {
    constructor(user, host, database, password, adminId) {
        this.client = new Client({
            user,
            host,
            database,
            password,
            port: 5432,
            client_encoding: 'UTF8'
        });
        this.client.connect();

        this.adminId = adminId
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
    
    async getTopUsers(userId = null, adminId = this.adminId, month = false) {
        try {
            if (month) {
                const result = await this.client.query('SELECT * FROM get_top_users_month($1, $2)', [userId, adminId]);
                return result.rows;
            } 

            const result = await this.client.query('SELECT * FROM get_top_users($1, $2)', [userId, adminId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getTopUsersByRefs(userId = null, adminId = this.adminId, month = false) {
        try {
            if (month) {
                const result = await this.client.query('SELECT * FROM get_top_users_by_refs_month($1, $2)', [userId, adminId]);
                return result.rows;
            }

            const result = await this.client.query('SELECT * FROM get_top_users_by_refs($1, $2)', [userId, adminId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getLists(userId) {
        try {
            const result = await this.client.query('SELECT * FROM get_all_lists($1)', [userId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async addList(name) {
        try {
            const result = await this.client.query('SELECT add_list($1)', [name]);
            return result.rows[0].add_list;
        } catch (error) {
            throw error;
        }
    }

    async addUserToList(listId, userId) {
        try {
            const result = await this.client.query('SELECT add_user_to_list($1, $2)', [listId, userId]);
            return result.rows[0].add_user_to_list;
        } catch (error) {
            throw error;
        }
    }

    async addUsersToList(listId, userIds) {
        try {
            const result = await this.client.query('SELECT add_users_to_list($1, $2::NUMERIC[])', [listId, userIds]);
            return result.rows[0].add_users_to_list;
        } catch (error) {
            throw error;
        }
    }

    async deleteUserFromList(listId, userId) {
        try {
            const result = await this.client.query('SELECT delete_user_from_list($1, $2)', [listId, userId]);
            return result.rows[0].delete_user_from_list;
        } catch (error) {
            throw error;
        }
    }

    async getUsersFromList(listId) {
        try {
            const result = await this.client.query('SELECT * FROM get_users_from_list($1)', [listId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async deleteList(listId) {
        try {
            const result = await this.client.query('SELECT delete_list($1)', [listId]);
            return result.rows[0].delete_list;
        } catch (error) {
            throw error;
        }
    }

    async getAllStatistics() {
        try {
            const result = await this.client.query('SELECT * FROM get_all_statistics($1)', [this.adminId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserRepository;
