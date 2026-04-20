import { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    DisconnectReason,
    Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'readline';
import os from 'os';
import fs from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startMazzuBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_auth');

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
        },
        printQRInTerminal: !process.argv.includes('--code'),
        logger: pino({ level: 'fatal' }),
        browser: Browsers.ubuntu("Chrome")
    });

    // --- COLLEGAMENTO CON CODICE ---
    if (!sock.authState.creds.registered && process.argv.includes('--code')) {
        console.log("\n--- CONFIGURAZIONE MAZZUBOT ---");
        const phoneNumber = await question('Inserisci il numero (es. 393331234567): ');
        
        console.log("⏳ Attendo 10 secondi per stabilizzare la connessione (evita errore 428)...");
        await delay(10000); 

        try {
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\n🚀 IL TUO CODICE: ${code}\n`);
        } catch (err) {
            console.log("\n❌ Errore nel generare il codice. Riprova tra poco.");
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log('\n✨ Mazzubot ONLINE!');
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startMazzuBot();
        }
    });

    // --- CARICAMENTO PLUGIN ESTERNI ---
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (!body.startsWith('.')) return;
        const command = body.slice(1).trim().split(' ').shift().toLowerCase();

        const pluginFolder = './plugins';
        if (fs.existsSync(pluginFolder)) {
            const files = fs.readdirSync(pluginFolder).filter(f => f.endsWith('.js'));
            for (const file of files) {
                try {
                    const plugin = await import(pathToFileURL(path.join(pluginFolder, file)).href);
                    const p = plugin.default || plugin;
                    if (p.commands.includes(command)) {
                        await p.run(sock, msg, { command, body });
                    }
                } catch (e) {
                    // Plugin ignorato se ha errori
                }
            }
        }
    });
}

startMazzuBot();
