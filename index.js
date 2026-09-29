const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
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

// Render Web Service ko ek HTTP port chahiye.
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Al Huda eQuran AI Bot is running.');
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
client.on('qr', (qr) => {
    console.log('\n--- SCAN THIS QR CODE WITH YOUR WHATSAPP ---\n');
    qrcode.generate(qr, { small: true });
    console.log('\n--- QR CODE END ---\n');
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
