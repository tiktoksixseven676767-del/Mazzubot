const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore 
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const readline = require('readline')

// Configurazione per leggere l'input da terminale
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startMazzuBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_auth')

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
        },
        printQRInTerminal: false, // Disattiviamo il QR code
        logger: pino({ level: 'fatal' })
    })

    // Logica per il Pairing Code (Codice a 8 caratteri)
    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('Inserisci il tuo numero di telefono (es. 393331234567): ')
        const code = await sock.requestPairingCode(phoneNumber)
        console.log(`\nIl tuo codice di collegamento è: ${code}\n`)
        console.log('Apri WhatsApp -> Dispositivi collegati -> Collega con numero di telefono')
    }

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection } = update
        if (connection === 'open') console.log('Mazzubot è connesso!')
        if (connection === 'close') startMazzuBot()
    })
}

startMazzuBot()
