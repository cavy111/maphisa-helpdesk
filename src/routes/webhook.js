const express = require('express');
const router = express.Router();
const { handleMessage } = require('../handlers/conversation');

router.post('/', async (req, res) => {
    const from = req.body.From?.replace('whatsapp:', '');
    const message = req.body.Body;

    if (!from || !message) {
        return res.sendStatus(400);
    }

    try {
        await handleMessage(from, message);
        res.sendStatus(200);
    } catch (err) {
        console.error('Webhook error:', err);
        res.sendStatus(500);
    }
});

module.exports = router;