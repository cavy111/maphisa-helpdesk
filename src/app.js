require('dotenv').config();
const express = require('express');
const webhookRouter = require('./routes/webhook');
const runMigrations = require('./db/migrations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/webhook', webhookRouter);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

runMigrations();

app.listen(PORT, () => {
    console.log(`Helpdesk server running on port ${PORT}`);
});