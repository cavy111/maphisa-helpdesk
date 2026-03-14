const pool = require('../db/database');
const { sendMessage } = require('../services/whatsapp');
const { createTicket, getTicketByNumber, getTicketsByNumber } = require('../services/tickets');
const { logTicketToSheet } = require('../services/sheets');

const CATEGORIES = {
    '1': 'Computer / Laptop',
    '2': 'Printer / Scanner',
    '3': 'Internet / Network',
    '4': 'System / Software',
    '5': 'Other'
};

const DEPARTMENTS = {
    '1': 'Administration',
    '2': 'Outpatients',
    '3': 'Ward A',
    '4': 'Ward B',
    '5': 'Pharmacy',
    '6': 'Laboratory',
    '7': 'Other'
};

async function getState(whatsappNumber) {
    const result = await pool.query(
        'SELECT * FROM conversation_state WHERE whatsapp_number = $1',
        [whatsappNumber]
    );
    if (!result.rows[0]) return { step: 'main_menu', data: {} };
    return { step: result.rows[0].step, data: JSON.parse(result.rows[0].data) };
}

async function setState(whatsappNumber, step, data = {}) {
    await pool.query(`
        INSERT INTO conversation_state (whatsapp_number, step, data)
        VALUES ($1, $2, $3)
        ON CONFLICT (whatsapp_number)
        DO UPDATE SET step = $2, data = $3, updated_at = CURRENT_TIMESTAMP
    `, [whatsappNumber, step, JSON.stringify(data)]);
}

async function resetState(whatsappNumber) {
    await setState(whatsappNumber, 'main_menu', {});
}

function resetState(whatsappNumber) {
    setState(whatsappNumber, 'main_menu', {});
}

async function notifyICTTeam(ticketData, ticketNumber) {
    const staffNumbers = process.env.ICT_STAFF_NUMBERS?.split(',') || [];
    
    const notification =
        `🔔 *New ICT Fault Reported*\n\n` +
        `🎫 Ticket: *${ticketNumber}*\n` +
        `👤 Staff: ${ticketData.staff_name}\n` +
        `🏢 Department: ${ticketData.department}\n` +
        `🔧 Category: ${ticketData.category}\n` +
        `📝 Description: ${ticketData.description}\n` +
        `📊 Status: *Pending*\n` +
        `🕒 Time: ${new Date().toLocaleString()}`;

    for (const number of staffNumbers) {
        await sendMessage(number.trim(), notification);
    }
}

async function handleMessage(whatsappNumber, message) {
    const input = message.trim().toLowerCase();
    const { step, data } = await getState(whatsappNumber);

    // allow user to restart at any point
    if (input === 'menu' || input === 'hi' || input === 'hello' || input === 'start') {
        return await showMainMenu(whatsappNumber);
    }

    switch (step) {
        case 'main_menu':
            return await handleMainMenu(whatsappNumber, input);

        case 'enter_name':
            return await handleEnterName(whatsappNumber, message, data);

        case 'select_department':
            return await handleSelectDepartment(whatsappNumber, input, data);

        case 'select_category':
            return await handleSelectCategory(whatsappNumber, input, data);

        case 'describe_fault':
            return await handleDescribeFault(whatsappNumber, message, data);

        case 'check_status':
            return await handleCheckStatus(whatsappNumber, message);

        default:
            return await showMainMenu(whatsappNumber);
    }
}

async function showMainMenu(whatsappNumber) {
    resetState(whatsappNumber);
    await sendMessage(whatsappNumber,
        `Welcome to Maphisa District Hospital ICT Helpdesk 🏥\n\n` +
        `Please select an option:\n\n` +
        `1️⃣ Report ICT Fault\n` +
        `2️⃣ Check Fault Status\n` +
        `3️⃣ ICT Support Information\n\n` +
        `Reply with a number to continue.`
    );
}

async function handleMainMenu(whatsappNumber, input) {
    switch (input) {
        case '1':
            setState(whatsappNumber, 'enter_name', {});
            await sendMessage(whatsappNumber,
                `Please enter your *full name*:`
            );
            break;

        case '2':
            setState(whatsappNumber, 'check_status', {});
            await sendMessage(whatsappNumber,
                `Please enter your *ticket number* (e.g. ICT-202501-001):`
            );
            break;

        case '3':
            await sendMessage(whatsappNumber,
                `📞 *ICT Support Information*\n\n` +
                `Office: ICT Department, Admin Block\n` +
                `Hours: Monday - Friday, 8am - 5pm\n` +
                `Emergency: Contact the ICT Officer on duty\n\n` +
                `Reply *menu* to return to the main menu.`
            );
            break;

        default:
            await sendMessage(whatsappNumber,
                `Invalid option. Please reply with *1*, *2*, or *3*.`
            );
    }
}

async function handleEnterName(whatsappNumber, message, data) {
    const name = message.trim();
    if (name.length < 2) {
        await sendMessage(whatsappNumber, `Please enter a valid full name.`);
        return;
    }

    const updatedData = { ...data, staff_name: name };
    setState(whatsappNumber, 'select_department', updatedData);

    const deptList = Object.entries(DEPARTMENTS)
        .map(([k, v]) => `${k}️⃣ ${v}`)
        .join('\n');

    await sendMessage(whatsappNumber,
        `Thank you, *${name}*!\n\n` +
        `Please select your *department*:\n\n` +
        `${deptList}`
    );
}

async function handleSelectDepartment(whatsappNumber, input, data) {
    const department = DEPARTMENTS[input];
    if (!department) {
        await sendMessage(whatsappNumber,
            `Invalid option. Please reply with a number between 1 and ${Object.keys(DEPARTMENTS).length}.`
        );
        return;
    }

    const updatedData = { ...data, department };
    setState(whatsappNumber, 'select_category', updatedData);

    const catList = Object.entries(CATEGORIES)
        .map(([k, v]) => `${k}️⃣ ${v}`)
        .join('\n');

    await sendMessage(whatsappNumber,
        `Please select the *fault category*:\n\n` +
        `${catList}`
    );
}

async function handleSelectCategory(whatsappNumber, input, data) {
    const category = CATEGORIES[input];
    if (!category) {
        await sendMessage(whatsappNumber,
            `Invalid option. Please reply with a number between 1 and ${Object.keys(CATEGORIES).length}.`
        );
        return;
    }

    const updatedData = { ...data, category };
    setState(whatsappNumber, 'describe_fault', updatedData);

    await sendMessage(whatsappNumber,
        `Please *describe the fault* briefly:\n\n` +
        `(e.g. "Computer won't turn on", "No internet in Ward B")`
    );
}

async function handleDescribeFault(whatsappNumber, message, data) {
    const description = message.trim();
    if (description.length < 5) {
        await sendMessage(whatsappNumber,
            `Please provide a brief description of the fault (at least 5 characters).`
        );
        return;
    }

    const ticketData = {
        ...data,
        whatsapp_number: whatsappNumber,
        description
    };

    const ticketNumber = createTicket(ticketData);

    // log to Google Sheets
    await logTicketToSheet({
        ...ticketData,
        ticket_number: ticketNumber
    });
    
    await notifyICTTeam(ticketData, ticketNumber);

    resetState(whatsappNumber);

    await sendMessage(whatsappNumber,
        `✅ *Fault reported successfully!*\n\n` +
        `🎫 Ticket: *${ticketNumber}*\n` +
        `👤 Name: ${ticketData.staff_name}\n` +
        `🏢 Department: ${ticketData.department}\n` +
        `🔧 Category: ${ticketData.category}\n` +
        `📝 Description: ${description}\n` +
        `📊 Status: *Pending*\n\n` +
        `You will be notified when your ticket is updated.\n` +
        `Reply *menu* to return to the main menu.`
    );
}

async function handleCheckStatus(whatsappNumber, message) {
    const ticketNumber = message.trim().toUpperCase();
    const ticket = getTicketByNumber(ticketNumber);

    if (!ticket) {
        await sendMessage(whatsappNumber,
            `❌ Ticket *${ticketNumber}* not found.\n\n` +
            `Please check the ticket number and try again.\n` +
            `Reply *menu* to return to the main menu.`
        );
        return;
    }

    const statusEmoji = {
        'Pending': '🟡',
        'In Progress': '🔵',
        'Resolved': '🟢'
    }[ticket.status] || '⚪';

    resetState(whatsappNumber);
    await sendMessage(whatsappNumber,
        `🎫 *Ticket Status*\n\n` +
        `Ticket: *${ticket.ticket_number}*\n` +
        `Category: ${ticket.category}\n` +
        `Description: ${ticket.description}\n` +
        `${statusEmoji} Status: *${ticket.status}*\n` +
        `Reported: ${new Date(ticket.created_at).toLocaleDateString()}\n\n` +
        `Reply *menu* to return to the main menu.`
    );
}

module.exports = { handleMessage };