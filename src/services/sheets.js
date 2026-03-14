const { google } = require('googleapis');
const path = require('path');

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function logTicketToSheet(ticket) {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:H',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[
                    ticket.ticket_number,
                    ticket.staff_name,
                    ticket.department,
                    ticket.category,
                    ticket.description,
                    'Pending',
                    new Date().toLocaleString(),
                    ticket.whatsapp_number
                ]]
            }
        });

        console.log('Ticket logged to Google Sheets:', ticket.ticket_number);
    } catch (err) {
        console.error('Google Sheets error:', err.message);
    }
}

async function updateTicketStatus(ticketNumber, status) {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        // find the row with this ticket number
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:A'
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === ticketNumber);

        if (rowIndex === -1) {
            console.log('Ticket not found in sheet:', ticketNumber);
            return;
        }

        // update status column (column F = index 6)
        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `Sheet1!F${rowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[status]]
            }
        });

        console.log('Ticket status updated in sheet:', ticketNumber, status);
    } catch (err) {
        console.error('Google Sheets update error:', err.message);
    }
}

module.exports = { logTicketToSheet, updateTicketStatus };