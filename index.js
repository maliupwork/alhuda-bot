const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

// Line 7: Yahan apni copy ki hui Gemini API Key paste karein
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"; 
const ai = new GoogleGenAI({ apiKey: "AQ." });

// Knowledge Base File Load Karein
const knowledgeBase = fs.readFileSync('knowledge_base.txt', 'utf8');

// Chat Memory Store Karne Ke Liye
const chatHistories = {};

// WhatsApp Client Setup
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// QR Code Display Event
client.on('qr', (qr) => {
    console.log('\n--- SCAN THIS QR CODE WITH YOUR WHATSAPP ---\n');
    qrcode.generate(qr, { small: true });
});

// Bot Ready Event
client.on('ready', () => {
    console.log('✅ Al Huda eQuran AI Bot is Live & Ready!');
});

// Message Receive Event
client.on('message', async (msg) => {
    // Group Messages Ko Ignore Karein
    if (msg.from.endsWith('@g.us')) return;

    const userId = msg.from;
    const userMessage = msg.body;

    if (!chatHistories[userId]) {
        chatHistories[userId] = [];
    }

    chatHistories[userId].push({ role: 'user', content: userMessage });

    try {
        const systemPrompt = `
You are the AI Assistant for Al Huda eQuran Academy.
Strictly adhere to all instructions, course details, pricing, discount rules, language preferences, and trial flows in the Knowledge Base provided below.

=== KNOWLEDGE BASE ===
${knowledgeBase}
======================
`;

        const formattedHistory = chatHistories[userId].map(h => `${h.role === 'user' ? 'Customer' : 'Agent'}: ${h.content}`).join('\n');
        
        const fullPrompt = `${systemPrompt}\n\nChat History:\n${formattedHistory}\n\nAgent:`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: fullPrompt
        });

        const reply = response.text.trim();
        chatHistories[userId].push({ role: 'model', content: reply });

        await msg.reply(reply);

    } catch (error) {
        console.error('Error processing message:', error);
    }
});

client.initialize();