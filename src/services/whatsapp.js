const axios = require('axios');

async function sendMessage(to, message) {
    try {
        console.log('Sending message to:', to);
        const result = await axios.post(
            `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: message }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Message sent to:', to);
        console.log('API response:', JSON.stringify(result.data, null, 2));
    } catch (err) {
        console.error('WhatsApp send error:', err.response?.data || err.message);
    }
}

module.exports = { sendMessage };