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

const knowledgeBase = fs.existsSync('knowledge_base.txt') 
    ? fs.readFileSync('knowledge_base.txt', 'utf8') 
    : 'No knowledge base.';

const chatHistories = {};
let latestQR = null;
let connectionStatus = 'Initializing...';

const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    if (req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        let qrContent = '
            if (req.url === '/qr') {
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
    });

    const qrContent = latestQR
        ? `<img id="qr" src="${latestQR}" width="400" height="400">`
        : `<h2 id="message">Waiting for WhatsApp QR Code...</h2>`;

    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Al Huda WhatsApp QR</title>

    <style>
        body {
            margin: 0;
            padding: 30px;
            background: #f3f4f6;
            font-family: Arial, sans-serif;
            text-align: center;
        }

        .box {
            max-width: 500px;
            margin: 30px auto;
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.15);
        }

        h1 {
            color: #064e3b;
        }

        #qr {
            display: block;
            width: 400px;
            max-width: 100%;
            height: auto;
            margin: 25px auto;
        }

        .status {
            font-size: 18px;
            font-weight: bold;
            color: #064e3b;
            margin-top: 20px;
        }

        .info {
            color: #555;
            margin-top: 15px;
        }
    </style>
</head>

<body>

<div class="box">

    <h1>Al Huda WhatsApp AI Bot</h1>

    ${qrContent}

    <div class="status">
        ${connectionStatus}
    </div>

    <div class="info">
        WhatsApp → Linked Devices → Link a Device
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
