const bcrypt = require('bcryptjs');
const mysql = require("mysql2/promise");
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

const name = 'Super Admin';
const username = 'admin';
const email = 'admin@admin.com';
const plainPassword = 'admin123';
const can_read = 1;
const can_write = 1;
const can_delete = 1;
const is_protected = 1;
const created_at = new Date();

(async () => {
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        console.log('Password hashed successfully.');

        const sql = `
            INSERT INTO admins 
            (name, username, email, password, can_read, can_write, can_delete, is_protected, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [results] = await db.query(sql, [
            name, username, email, hashedPassword,
            can_read, can_write, can_delete, is_protected,
            created_at
        ]);

        console.log('Super admin inserted successfully! Insert ID:', results.insertId);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.error('Admin with this email or username already exists.');
        } else {
            console.error('An error occurred:', err);
        }
    } finally {
        await db.end();
        process.exit();
    }
})();
