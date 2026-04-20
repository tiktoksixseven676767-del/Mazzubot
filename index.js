process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';
import './config.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import fs, { readdirSync, statSync, unlinkSync, existsSync, mkdirSync, rmSync, watch } from 'fs';
import yargs from 'yargs';
import { spawn } from 'child_process';
import lodash from 'lodash';
import chalk from 'chalk';
import syntaxerror from 'syntax-error';
import { format } from 'util';
import pino from 'pino';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import storeHelper from './lib/store.js';
import { Low, JSONFile } from 'lowdb';
import readline from 'readline';
import NodeCache from 'node-cache';

// --- CONFIGURAZIONE CARTELLE ---
const authFolder = 'session_auth'; // Cartella standard Mazzubot
const sessionFolder = path.join(process.cwd(), authFolder);
const tempDir = join(process.cwd(), 'temp');
if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

const { 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    Browsers, 
    jidNormalizedUser, 
    DisconnectReason 
} = await import('@whiskeysockets/baileys');

const { chain } = lodash;
protoType();
serialize();

// --- FUNZIONI DI LOG ---
function logMazzu(message, color = 'cyanBright') {
    const printer = chalk[color] || chalk.cyanBright;
    console.log(printer(`[ MAZZUBOT ] ${message}`));
}

// --- DATABASE ---
global.db = new Low(new JSONFile('database.json'));
global.loadDatabase = async function loadDatabase() {
    if (global.db.data !== null) return;
    await global.db.read().catch(console.error);
    global.db.data = { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {}, ...(global.db.data || {}) };
    global.db.chain = chain(global.db.data);
};
loadDatabase();

// --- SETUP CONNESSIONE ---
const { state, saveCreds } = await useMultiFileAuthState(authFolder);
const { version } = await fetchLatestBaileysVersion();
let rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const question = (t) => new Promise((resolver) => rl.question(t, (r) => resolver(r.trim())));

async function startMazzuBot() {
    const logger = pino({ level: 'silent' });
    
    const connectionOptions = {
        logger,
        printQRInTerminal: !process.argv.includes("code"),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: Browsers.ubuntu("Chrome"),
        version,
        getMessage: async (key) => { return undefined; }
    };

    global.conn = makeWASocket(connectionOptions);

    // --- LOGICA PAIRING CODE (Solo se non c'è sessione) ---
    if (!conn.authState.creds.registered && process.argv.includes("code")) {
        const phoneNumber = await question(chalk.bold.magenta('\nInserisci il numero di telefono (es. 39333...):\n> '));
        const code = await conn.requestPairingCode(phoneNumber.replace(/\D/g, ''));
        console.log(chalk.black.bgCyan('\n ꒰ 🚀 ꒱ CODICE DI COLLEGAMENTO: '), chalk.bold.white(code.match(/.{1,4}/g).join('-')), '\n');
    }

    // --- GESTORE EVENTI ---
    conn.ev.on('creds.update', saveCreds);
    
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) logMazzu("Scansiona il QR Code per connetterti!", "yellowBright");
        
        if (connection === 'connecting') logMazzu("Connessione in corso...", "blueBright");
        
        if (connection === 'open') {
            logMazzu(`Connesso con successo come ${conn.user.name || 'Mazzubot'}`, "greenBright");
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            logMazzu(`Connessione chiusa. Ragione: ${reason}`, "redBright");
            if (reason !== DisconnectReason.loggedOut) startMazzuBot();
        }
    });

    await global.reloadHandler();
}

// --- RELOAD HANDLER & PLUGINS ---
global.reloadHandler = async function (restatConn) {
    let handler = await import(`./handler.js?update=${Date.now()}`);
    conn.handler = handler.handler.bind(global.conn);
    conn.ev.on('messages.upsert', conn.handler);
    return true;
};

const pluginFolder = join(global.__dirname(import.meta.url), 'plugins');
global.plugins = {};

async function loadPlugins() {
    const files = readdirSync(pluginFolder).filter(file => file.endsWith('.js'));
    for (const file of files) {
        try {
            const module = await import(pathToFileURL(join(pluginFolder, file)).href);
            global.plugins[file] = module.default || module;
        } catch (e) {
            console.error(`Errore caricamento plugin ${file}:`, e);
        }
    }
}

// Inizializzazione
global.__filename = function(pathURL = import.meta.url) { return fileURLToPath(pathURL); };
global.__dirname = function(pathURL) { return path.dirname(global.__filename(pathURL)); };

loadPlugins();
startMazzuBot();
