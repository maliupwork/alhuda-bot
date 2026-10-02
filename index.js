const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
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
let rawQRData = '';

const server = http.createServer((req, res) => {
    if (req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (rawQRData) {
            const qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(rawQRData);
            res.end('
