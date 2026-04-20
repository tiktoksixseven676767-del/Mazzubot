const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const readline = require('readline')
const { exec } = require('child_process')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startMazzuBot() {
    // Gestione della sessione (cartella session_auth)
    const { state, saveCreds } = await useMultiFileAuthState('session_auth')

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"] // Aiuta a evitare blocchi
    })

    // Richiesta Pairing Code (8 caratteri)
    if (!sock.authState.creds.registered) {
        console.log("--- CONFIGURAZIONE MAZZUBOT ---")
        const phoneNumber = await question('Inserisci il numero di telefono (es. 393331234567): ')
        
        await delay(3000) // Ritardo di sicurezza per evitare l'errore 428
        try {
            const code = await sock.requestPairingCode(phoneNumber.trim())
            console.log(`\n✅ IL TUO CODICE DI COLLEGAMENTO: ${code}\n`)
            console.log("Apri WhatsApp -> Dispositivi collegati -> Collega con numero di telefono\n")
        } catch (err) {
            console.error("Errore nella generazione del codice. Riprova tra un minuto.", err)
        }
    }

    // Salvataggio credenziali
    sock.ev.on('creds.update', saveCreds)

    // Gestione connessione
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') {
            console.log('✨ Mazzubot connesso con successo!')
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connessione chiusa. Riconnessione in corso...', shouldReconnect)
            if (shouldReconnect) startMazzuBot()
        }
    })

    // Gestione Messaggi e Comandi
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        const from = msg.key.remoteJid
        const prefix = "."
        
        if (!body.startsWith(prefix)) return
        
        const command = body.slice(prefix.length).trim().split(' ').shift().toLowerCase()

        switch (command) {
            case 'menu':
                const menuText = `
🤖 *MAZZUBOT MENU* 🤖

Ciao *${msg.pushName || 'utente'}*!
Ecco cosa posso fare:

* ${prefix}menu - Mostra questa lista
* ${prefix}aggiorna - Scarica novità da GitHub

_Versione 1.0.0_
                `.trim()
                await sock.sendMessage(from, { text: menuText })
                break

            case 'aggiorna':
                await sock.sendMessage(from, { text: "🔄 Aggiornamento in corso..." })
                exec('git pull', (err, stdout) => {
                    if (err) return sock.sendMessage(from, { text: `❌ Errore: ${err.message}` })
                    sock.sendMessage(from, { text: `✅ Aggiornato!\n${stdout}\nIl bot si riavvia...` })
                    process.exit()
                })
                break
        }
    })
}

startMazzuBot()
