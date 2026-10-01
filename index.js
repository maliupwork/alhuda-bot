const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const http = require('http');

// Environment Validation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable is missing.');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Load Knowledge Base safely
const knowledgeBase = fs.existsSync('knowledge_base.txt') 
    ? fs.readFileSync('knowledge_base.txt', 'utf8') 
    : 'No knowledge base file found.';

// State Management
const chatHistories = {};
let latestQR = null;
let connectionStatus = 'Initializing...';

// Render Web Service HTTP Port Binding
const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    if (req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (latestQR) {
            res.end(`
                
                
                Aconst { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const http = require('http');

// 1. Environment Variable Check (Gemini API Key)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable is missing.');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// 2. Knowledge Base Load karna safely
const knowledgeBase = fs.existsSync('knowledge_base.txt') 
    ? fs.readFileSync('knowledge_base.txt', 'utf8') 
    : 'No knowledge base file found.';

// 3. State Management (Chat history & QR code)
const chatHistories = {};
let latestQR = null;
let connectionStatus = 'Initializing...';

// 4. Render ke liye HTTP Server (QR code browser mein dekhne ke liye)
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    if (req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        
        // Nested backticks ka masla khatam karne ke liye variable use kiya hai
        let qrContent = '
            
            
                
                WhatsApp QR Code
                    
                    Al Huda WhatsApp QR
