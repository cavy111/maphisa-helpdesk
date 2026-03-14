const express = require('express');
const router = express.Router();
const { handleMessage } = require('../handlers/conversation');

// Meta webhook verification
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verified');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// incoming messages
router.post('/', async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        console.log('Entry:', JSON.stringify(entry));
        console.log('Message:', JSON.stringify(message));

        if (!message) {
            console.log('No message found in payload');
            return res.sendStatus(200);
        }

        const from = message.from;
        const text = message.text?.body;

        console.log('From:', from, 'Text:', text);

        if (!text) {
            console.log('No text body found');
            return res.sendStatus(200);
        }

        await handleMessage(from, text);
        res.sendStatus(200);
    } catch (err) {
        console.error('Webhook error:', err);
        res.sendStatus(500);
    }
});

module.exports = router;