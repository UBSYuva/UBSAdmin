const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;
try {
    if (process.env.DB_HOST && process.env.DB_NAME) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    } else {
        throw new Error('Database env vars not set');
    }
} catch (err) {
    console.warn('[AI Studio] Database not connected — using mock pool');
    pool = {
        query: async () => [[]],
        execute: async () => [[]],
        getConnection: async () => ({
            query: async () => [[]],
            execute: async () => [[]],
            release: () => {}
        })
    };
}

module.exports = pool;
