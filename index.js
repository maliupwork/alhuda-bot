const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenAI } = require('@google/genai');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Gemini AI Setup
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Knowledge Base File Load
let knowledgeBase = '';
try {
    knowledgeBase = fs.readFileSync('knowledge_base.txt', 'utf8');
} catch (err) {
    console.log('Knowledge base file not found or empty.');
}

// WhatsApp Client Setup
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// QR Code Event
client.on('qr', (qr) => {
    console.log('\n--- SCAN THIS QR CODE WITH YOUR WHATSAPP ---\n');
    qrcode.generate(qr, { small: true });
});

// Ready Event
client.on('ready', () => {
    console.log('✅ Al Huda eQuran AI Bot is Live & Ready!');
});

// Message Event
client.on('message', async (msg) => {
    if (msg.fromMe || msg.isGroupMsg) return;

    try {
        const prompt = `You are a helpful assistant for Al Huda eQuran Academy. Use this knowledge base to answer: ${knowledgeBase}\n\nUser Question: ${msg.body}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        if (response && response.text) {
            await msg.reply(response.text);
        }
    } catch (error) {
        console.error('Error generating AI response:', error);
    }
});

client.initialize();
