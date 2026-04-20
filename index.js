const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
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

    if (!sock.authState.creds.registered) {
        console.log("--- CONFIGURAZIONE MAZZUBOT ---")
        const phoneNumber = await question('Inserisci il numero (es. 39333...): ')
        await delay(3000)
        const code = await sock.requestPairingCode(phoneNumber.trim())
        console.log(`\n✅ CODICE DI COLLEGAMENTO: ${code}\n`)
    }

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        const prefix = "."
        
        if (!body.startsWith(prefix)) return

        const command = body.slice(prefix.length).trim().split(' ').shift().toLowerCase()
        const args = body.trim().split(/ +/).slice(1)

        // Caricamento dinamico dei plugin
        const pluginFolder = path.join(__dirname, 'plugins')
        if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder)
        
        const pluginFiles = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'))

        for (const file of pluginFiles) {
            const plugin = require(path.join(pluginFolder, file))
            if (plugin.commands.includes(command)) {
                try {
                    await plugin.run(sock, msg, { args, command, body })
                } catch (e) {
                    console.error(`Errore nel plugin ${file}:`, e)
                }
            }
        }
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') console.log('✨ Mazzubot è ONLINE!')
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startMazzuBot()
        }
    })
}

startMazzuBot()
