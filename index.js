const fs = require('fs');
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const bodyParser = require('body-parser');
const axios = require('axios');

// Initialize Express
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Environment variables
const PHP_WEBHOOK_URL = process.env.PHP_WEBHOOK_URL;

if (!PHP_WEBHOOK_URL) {
    console.error('ERROR: PHP_WEBHOOK_URL environment variable is not set!');
}

// WhatsApp Events
client.on('qr', (qr) => {
    console.log('QR Code received! Scan this with your phone:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

client.on('message_create', async (msg) => {
    // Prevent bot from replying to itself to avoid infinite loops if needed, 
    // but requirement asks to forward all messages.
    // If you want to ignore self: if (msg.fromMe) return;

    console.log('Message received:', msg.body);

    if (PHP_WEBHOOK_URL) {
        try {
            await axios.post(PHP_WEBHOOK_URL, {
                from: msg.from,
                to: msg.to,
                body: msg.body,
                pushName: msg._data?.notifyName || '',
                fromMe: msg.fromMe
            });
            console.log('Message forwarded to PHP webhook successfully.');
        } catch (error) {
            console.error('Failed to forward message to PHP webhook:', error.message);
        }
    }
});

client.initialize();

// Express Routes

// 1. Ping endpoint for UptimeRobot
app.get('/ping', (req, res) => {
    res.send('pong');
});

// 2. Send message endpoint for PHP
app.post('/send', async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Missing "to" or "message" fields' });
    }

    try {
        // "to" must be properly formatted, e.g., '1234567890@c.us'
        // If the user sends raw number, we might need to append suffix.
        // Assuming PHP sends correct format or just number.
        // Let's ensure it has @c.us if not present for basic numbers
        let chatId = to;
        if (!chatId.includes('@')) {
            chatId = `${chatId}@c.us`;
        }

        const response = await client.sendMessage(chatId, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Gateway running on port ${port}`);
});
