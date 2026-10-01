const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const http = require('http');

// 1. Environment & AI Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable is missing.');
    process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// 2. State & Knowledge Base
const knowledgeBase = fs.existsSync('knowledge_base.txt') 
    ? fs.readFileSync('knowledge_base.txt', 'utf8') 
    : '';
const chatHistories = {};
let latestQR = null;
let connectionStatus = 'Initializing...';

// 3. Render HTTP Server (for your /qr webpage)
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    if (req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
