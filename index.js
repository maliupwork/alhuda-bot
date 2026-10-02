const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const http = require('http');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is missing.');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const knowledgeBase = fs.existsSync('knowledge_base.txt') ? fs.readFileSync('knowledge_base.txt', 'utf8') : '';

let connectionStatus = 'Initializing...';

// Render ke liye simple web server taaki port bind error na aaye
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Al Huda Bot Status: ' + connectionStatus);
});
server.listen(process.env.PORT || 10000);

async function startWhatsAppBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            connectionStatus = 'Waiting for QR scan...';
            console.log('\n=== SCAN THIS QR CODE IN RENDER LOGS ===');
            QRCode.toString(qr, { type: 'terminal', small: true }, (err, url) => {
                if (!err) console.log(url);
            });
        }
        if (connection === 'close') {
            connectionStatus = 'Disconnected';
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startWhatsAppBot();
            }
        } else if (connection === 'open') {
            connectionStatus = 'Connected ✅';
            console.log('✅ WhatsApp successfully connected!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const remoteJid = msg.key.remoteJid;
        if (remoteJid.endsWith('@g.us')) return;

        const userMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!userMessage) return;

        try {
            const fullPrompt = `You are AI for Al Huda eQuran Academy.\nKB:\n\({knowledgeBase}\n\nCustomer:\){userMessage}\nAgent:`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt
            });

            const reply = response.text?.trim();
            if (reply) {
                await sock.sendMessage(remoteJid, { text: reply });
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
}

startWhatsAppBot();
