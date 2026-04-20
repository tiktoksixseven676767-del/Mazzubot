const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    DisconnectReason 
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const readline = require('readline')
const fs = require('fs')
const path = require('path')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startMazzuBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_auth')

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    })

    // --- LOGICA DI COLLEGAMENTO ---
    if (!sock.authState.creds.registered) {
        console.log("--- CONFIGURAZIONE MAZZUBOT ---")
        const phoneNumber = await question('Inserisci il numero (es. 39333...): ')
        
        console.log("⏳ Attendo 10 secondi per stabilizzare la connessione...")
        await delay(10000) // Il delay per evitare l'errore 428
        
        try {
            const code = await sock.requestPairingCode(phoneNumber.trim())
            console.log(`\n✅ CODICE DI COLLEGAMENTO: ${code}\n`)
        } catch (err) {
            console.error("Errore nel pairing. Riprova tra poco.", err)
        }
    }

    sock.ev.on('creds.update', saveCreds)

    // --- CARICAMENTO PLUGIN ---
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        if (!body.startsWith('.')) return

        const command = body.slice(1).trim().split(' ').shift().toLowerCase()
        const args = body.trim().split(/ +/).slice(1)

        const pluginFolder = path.join(__dirname, 'plugins')
        if (fs.existsSync(pluginFolder)) {
            const pluginFiles = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'))
            for (const file of pluginFiles) {
                const plugin = require(path.join(pluginFolder, file))
                if (plugin.commands.includes(command)) {
                    await plugin.run(sock, msg, { args, command, body })
                }
            }
        }
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') console.log('✨ Mazzubot ONLINE!')
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startMazzuBot()
        }
    })
}

startMazzuBot()
