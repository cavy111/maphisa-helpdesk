const db = require('../db/database');

function generateTicketNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count + 1;
    return `ICT-${year}${month}-${String(count).padStart(3, '0')}`;
}

function createTicket(data) {
    const ticketNumber = generateTicketNumber();
    const stmt = db.prepare(`
        INSERT INTO tickets (ticket_number, whatsapp_number, staff_name, department, category, description)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
        ticketNumber,
        data.whatsapp_number,
        data.staff_name,
        data.department,
        data.category,
        data.description
    );
    return ticketNumber;
}

function getTicketByNumber(ticketNumber) {
    return db.prepare('SELECT * FROM tickets WHERE ticket_number = ?').get(ticketNumber);
}

function getTicketsByNumber(whatsappNumber) {
    return db.prepare(
        'SELECT * FROM tickets WHERE whatsapp_number = ? ORDER BY created_at DESC LIMIT 5'
    ).all(whatsappNumber);
}

module.exports = { createTicket, getTicketByNumber, getTicketsByNumber };