import baileys from '@whiskeysockets/baileys';
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    DisconnectReason,
    Browsers
} = baileys;

import pino from 'pino';
import readline from 'readline';
import os from 'os';

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

    // --- LOGICA DI COLLEGAMENTO ---
    if (!sock.authState.creds.registered && process.argv.includes('--code')) {
        console.log("\n--- CONFIGURAZIONE MAZZUBOT ---");
        const phoneNumber = await question('Inserisci il numero (es. 39333...): ');
        
        console.log("⏳ Attendo 10 secondi per stabilizzare la connessione...");
        await delay(10000); // Fondamentale per evitare errore 428

        try {
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\n🚀 IL TUO CODICE: ${code}\n`);
        } catch (err) {
            console.log("\n❌ Errore nel generare il codice. Riprova tra un minuto.");
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

    // --- COMANDO PING ESTETICO ---
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (body === '.ping') {
            const uptime = process.uptime();
            const d = Math.floor(uptime / (3600 * 24));
            const h = Math.floor((uptime % (3600 * 24)) / 3600);
            const m_up = Math.floor((uptime % 3600) / 60);
            const s_up = Math.floor(uptime % 60);
            const uptimeStr = `${d.toString().padStart(2, '0')}:${h.toString().padStart(2, '0')}:${m_up.toString().padStart(2, '0')}:${s_up.toString().padStart(2, '0')}`;

            const totalRam = (os.totalmem() / (1024 ** 3)).toFixed(2);
            const freeRam = (os.freemem() / (1024 ** 3)).toFixed(2);
            const usedRam = (totalRam - freeRam).toFixed(2);

            const testoPing = `
⋆ ★ 🚀 \`STATO SISTEMA\` 🚀 ★ ⋆
╭♡꒷ ๑ ⋆˚₊⋆───ʚ˚ɞ───⋆˚₊⋆ ๑ ⪩
୧ ⌛ \`Uptime:\` ${uptimeStr}
୧ ⚡ \`Ping:\` 0.45 ms
  💻 \`CPU:\` ${os.cpus()[0].model}
  🔋 \`Utilizzo:\` ${(os.loadavg()[0]).toFixed(2)}%
  💾 \`RAM:\` ${usedRam} GB / ${totalRam} GB
  🟢 \`Libera:\` ${freeRam} GB
╰♡꒷ ๑ ⋆˚₊⋆───ʚ˚ɞ───⋆˚₊⋆ ๑ ⪩`.trim();

            await sock.sendMessage(from, { 
                video: { url: './ping.mp4' }, // Assicurati di avere il video del gatto
                caption: testoPing,
                gifPlayback: true 
            });
        }
    });
}

startMazzuBot();
