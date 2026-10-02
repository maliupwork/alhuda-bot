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


// ===============================
// QR CODE VARIABLES
// ===============================

let latestQR = null;
let connectionStatus = 'Starting WhatsApp...';


// ===============================
// RENDER HTTP SERVER
// ===============================

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {

    // Main page
    if (req.url === '/') {

        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Al Huda WhatsApp Bot</title>

    <style>
        body {
            margin: 0;
            padding: 40px 20px;
            background: #f3f4f6;
            font-family: Arial, sans-serif;
            text-align: center;
        }

        .box {
            max-width: 550px;
            margin: 40px auto;
            background: white;
            padding: 40px 25px;
            border-radius: 20px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.12);
        }

        h1 {
            color: #064e3b;
        }

        .status {
            margin: 25px 0;
            font-size: 18px;
            font-weight: bold;
        }

        .qr-button {
            display: inline-block;
            padding: 15px 25px;
            background: #064e3b;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
        }

        .qr-button:hover {
            background: #043f30;
        }
    </style>
</head>

<body>

<div class="box">

    <h1>Al Huda WhatsApp AI Bot</h1>

    <div class="status">
        Status: ${connectionStatus}
    </div>

    <a class="qr-button" href="/qr" target="_blank">
        Open WhatsApp QR Code
    </a>

</div>

</body>
</html>
        `);

        return;
    }


    // QR CODE PAGE
    if (req.url === '/qr') {

        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        const qrContent = latestQR
            ? `
                <img
                    src="${latestQR}"
                    alt="WhatsApp QR Code"
                    style="
                        width:400px;
                        max-width:90vw;
                        height:auto;
                        display:block;
                        margin:25px auto;
                    "
                >
              `
            : `
                <h2>Waiting for WhatsApp QR Code...</h2>
                <p>Please wait a few seconds.</p>
              `;

        res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>WhatsApp QR Code - Al Huda</title>

    <style>
        body {
            margin: 0;
            padding: 30px 15px;
            background: #f3f4f6;
            font-family: Arial, sans-serif;
            text-align: center;
        }

        .box {
            max-width: 550px;
            margin: 20px auto;
            background: white;
            padding: 30px 20px;
            border-radius: 20px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.15);
        }

        h1 {
            color: #064e3b;
            font-size: 28px;
        }

        .instruction {
            font-size: 17px;
            color: #444;
            margin: 15px 0;
        }

        .status {
            margin-top: 20px;
            font-size: 18px;
            font-weight: bold;
            color: #064e3b;
        }

        .qr-container {
            background: white;
            padding: 15px;
            display: inline-block;
            border-radius: 12px;
        }
    </style>
</head>

<body>

<div class="box">

    <h1>WhatsApp QR Code</h1>

    <div class="instruction">
        WhatsApp → Linked Devices → Link a Device
    </div>

    <div class="qr-container">
        ${qrContent}
    </div>

    <div class="status">
        ${connectionStatus}
    </div>

</div>

<script>
    setTimeout(function() {
        location.reload();
    }, 5000);
</script>

</body>
</html>
        `);

        return;
    }


    // DEFAULT
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    res.end('Al Huda Bot is Running!');
});


server.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP server listening on port ${PORT}`);
});


// ===============================
// WHATSAPP BOT
// ===============================

async function startWhatsAppBot() {

    const { state, saveCreds } =
        await useMultiFileAuthState('./auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });


    sock.ev.on('creds.update', saveCreds);


    // ===============================
    // CONNECTION UPDATE + REAL QR
    // ===============================

    sock.ev.on('connection.update', async (update) => {

        const { connection, lastDisconnect, qr } = update;


        // REAL BAILEYS QR CODE
        if (qr) {

            try {

                latestQR = await QRCode.toDataURL(qr, {
                    width: 500,
                    margin: 2,
                    errorCorrectionLevel: 'M'
                });

                connectionStatus = 'QR Code Ready - Scan with WhatsApp';

                console.log('\n--- WHATSAPP QR CODE GENERATED ---');
                console.log('Open your Render URL and click "Open WhatsApp QR Code".');

            } catch (error) {

                console.error('QR CODE GENERATION ERROR:', error);

            }
        }


        // WHATSAPP CONNECTED
        if (connection === 'open') {

            latestQR = null;

            connectionStatus = 'WhatsApp Connected Successfully';

            console.log('✅ WhatsApp successfully connected!');

        }


        // CONNECTION CLOSED
        if (connection === 'close') {

            latestQR = null;

            if (
                lastDisconnect?.error?.output?.statusCode
                !== DisconnectReason.loggedOut
            ) {

                connectionStatus = 'Reconnecting to WhatsApp...';

                console.log('WhatsApp connection closed. Reconnecting...');

                startWhatsAppBot();

            } else {

                connectionStatus = 'Logged out. Please scan a new QR code.';

                console.log('WhatsApp logged out.');

            }
        }


        if (connection === 'connecting') {

            connectionStatus = 'Connecting to WhatsApp...';

        }

    });


    // ===============================
    // RECEIVE WHATSAPP MESSAGES
    // ===============================

    sock.ev.on('messages.upsert', async ({ messages, type }) => {

        if (type !== 'notify') return;

        const msg = messages[0];

        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;

        if (remoteJid.endsWith('@g.us')) return;

        const userMessage =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        if (!userMessage) return;


        try {

            const fullPrompt =
                `You are AI for Al Huda eQuran Academy.\nKB:\n\\(${knowledgeBase}\n\nCustomer:)${userMessage}\nAgent:`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt
            });

            const reply = response.text?.trim();

            if (reply) {

                await sock.sendMessage(remoteJid, {
                    text: reply
                });

            }

        } catch (error) {

            console.error('Error processing message:', error);

        }

    });
}


startWhatsAppBot();
