const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkUsers() {
    try {
        const result = await pool.query('SELECT id, email, full_name, role FROM users');
        console.log('--- START USERS LIST ---');
        result.rows.forEach(user => {
            console.log(`ID: ${user.id} | Email: ${user.email} | Name: ${user.full_name} | Role: ${user.role}`);
        });
        console.log('--- END USERS LIST ---');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkUsers();
