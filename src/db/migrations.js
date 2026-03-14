const pool = require('./database');

async function runMigrations() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tickets (
            id SERIAL PRIMARY KEY,
            ticket_number TEXT UNIQUE NOT NULL,
            whatsapp_number TEXT NOT NULL,
            staff_name TEXT,
            department TEXT,
            category TEXT,
            description TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS conversation_state (
            id SERIAL PRIMARY KEY,
            whatsapp_number TEXT UNIQUE NOT NULL,
            step TEXT DEFAULT 'main_menu',
            data TEXT DEFAULT '{}',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('Migrations complete');
}

module.exports = runMigrations;