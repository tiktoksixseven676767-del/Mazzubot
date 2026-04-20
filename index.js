import baileys from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason, Browsers } = baileys;
import pino from 'pino';
import readline from 'readline';
import fs from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startMazzuBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_auth');
    const sock = makeWASocket({
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })) },
        printQRInTerminal: !process.argv.includes('--code'),
        logger: pino({ level: 'fatal' }),
        browser: Browsers.ubuntu("Chrome")
    });

    // --- COLLEGAMENTO ---
    if (!sock.authState.creds.registered && process.argv.includes('--code')) {
        console.log("\n--- CONFIGURAZIONE MAZZUBOT ---");
        const phoneNumber = await question('Inserisci il numero (es. 39333...): ');
        await delay(10000); // Evita errore 428
        try {
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\n🚀 CODICE DA INSERIRE: ${code}\n`);
        } catch (err) { console.log("\n❌ Errore. Riprova tra un minuto."); }
    }

    sock.ev.on('creds.update', saveCreds);

    // --- LOADER PLUGIN ---
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!body.startsWith('.')) return;

        const command = body.slice(1).trim().split(' ').shift().toLowerCase();
        const pluginPath = path.join(process.cwd(), 'plugins', `${command}.js`);

        if (fs.existsSync(pluginPath)) {
            try {
                const plugin = await import(pathToFileURL(pluginPath).href);
                await plugin.default.run(sock, msg);
            } catch (e) { console.error(`Errore nel plugin ${command}:`, e); }
        }
    });

    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') console.log('\n✨ Mazzubot ONLINE!');
        if (update.connection === 'close') startMazzuBot();
    });
}
startMazzuBot();
