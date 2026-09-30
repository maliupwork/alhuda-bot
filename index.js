const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const { GoogleGenAI } = require('@google/genai');
const puppeteer = require('puppeteer');
const fs = require('fs');
const http = require('http');

// Gemini API key Render Environment Variable se aayegi.
// Render Dashboard > Environment > GEMINI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable is missing.');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Knowledge Base
const knowledgeBase = fs.readFileSync('knowledge_base.txt', 'utf8');

// Simple in-memory chat history
const chatHistories = {};
let latestQR = null;

// Render Web Service ko ek HTTP port chahiye.
const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    if (req.url === '/qr' && latestQR) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Al Huda WhatsApp QR</title>
            </head>
            <body style="font-family:Arial;text-align:center;padding:30px;">
                <h2>Scan WhatsApp QR Code</h2>
                <p>WhatsApp → Linked Devices → Link a Device</p>
                <img src="${latestQR}" style="width:400px;max-width:90%;">
                <p>Scan this QR code with your WhatsApp.</p>
            </body>
            </html>
        `);
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <h2>Al Huda eQuran AI Bot is running.</h2>
        <p>QR code is available at <a href="/qr">/qr</a></p>
    `);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP server listening on 0.0.0.0:${PORT}`);
});

// Puppeteer ke downloaded Chrome ka exact executable path use karein.

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote'
        ]
    }
});

// QR Code
client.on('qr', async (qr) => {
    console.log('\n--- WHATSAPP QR CODE GENERATED ---\n');

    try {
        const qrDataUrl = await QRCode.toDataURL(qr);

        console.log('QR code generated successfully.');
        console.log('Open your Render service URL in a browser to view the QR code.');

        latestQR = qrDataUrl;
    } catch (error) {
        console.error('❌ QR generation failed:', error);
    }
});

// Ready
client.on('ready', () => {
    console.log('✅ Al Huda eQuran AI Bot is Live & Ready!');
});

// Authentication events
client.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated successfully.');
});

client.on('auth_failure', (message) => {
    console.error('❌ WhatsApp authentication failed:', message);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp disconnected:', reason);
});

// Messages
client.on('message', async (msg) => {
    try {
        // Groups ignore
        if (msg.from.endsWith('@g.us')) return;

        const userId = msg.from;
        const userMessage = msg.body?.trim();

        if (!userMessage) return;

        if (!chatHistories[userId]) {
            chatHistories[userId] = [];
        }

        chatHistories[userId].push({
            role: 'user',
            content: userMessage
        });

        const systemPrompt = `
You are the AI Assistant for Al Huda eQuran Academy.
Strictly follow the Knowledge Base below.
Do not invent fees, discounts, schedules, teacher availability, policies,
booking confirmations, links, payment methods, or any other information.
Answer the customer's actual question first.
Remember information already provided in the current conversation.
Reply in the customer's language/style.

=== KNOWLEDGE BASE ===
${knowledgeBase}
======================
`;

        const formattedHistory = chatHistories[userId]
            .map(h => `${h.role === 'user' ? 'Customer' : 'Agent'}: ${h.content}`)
            .join('\n');

        const fullPrompt =
            `${systemPrompt}\n\nChat History:\n${formattedHistory}\n\nAgent:`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: fullPrompt
        });

        const reply = response.text?.trim();

        if (!reply) {
            console.error('Gemini returned an empty response.');
            return;
        }

        chatHistories[userId].push({
            role: 'model',
            content: reply
        });

        await msg.reply(reply);

    } catch (error) {
        console.error('Error processing message:', error);
    }
});

client.initialize().catch((error) => {
    console.error('❌ WhatsApp client failed to initialize:', error);
    process.exit(1);
});
