const pool = require('../db/database');

function generateTicketNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `ICT-${year}${month}`;
}

async function createTicket(data) {
    const prefix = generateTicketNumber();
    const countResult = await pool.query('SELECT COUNT(*) as count FROM tickets');
    const count = parseInt(countResult.rows[0].count) + 1;
    const ticketNumber = `${prefix}-${String(count).padStart(3, '0')}`;

    await pool.query(`
        INSERT INTO tickets (ticket_number, whatsapp_number, staff_name, department, category, description)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [ticketNumber, data.whatsapp_number, data.staff_name, data.department, data.category, data.description]);

    return ticketNumber;
}

async function getTicketByNumber(ticketNumber) {
    const result = await pool.query('SELECT * FROM tickets WHERE ticket_number = $1', [ticketNumber]);
    return result.rows[0];
}

async function getTicketsByNumber(whatsappNumber) {
    const result = await pool.query(
        'SELECT * FROM tickets WHERE whatsapp_number = $1 ORDER BY created_at DESC LIMIT 5',
        [whatsappNumber]
    );
    return result.rows;
}

module.exports = { createTicket, getTicketByNumber, getTicketsByNumber };