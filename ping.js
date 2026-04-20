const { exec } = require('child_process')

module.exports = {
    commands: ['ping', 'aggiorna'],
    run: async (sock, msg, { command }) => {
        conconst { exec } = require('child_process')

module.exports = {
    commands: ['ping', 'aggiorna'],
    run: async (sock, msg, { command }) => {
        const from = msg.key.remoteJid

        if (command === 'ping') {
            await sock.sendMessage(from, { text: '🏓 Pong!' })
        }

        if (command === 'aggiorna') {
            await sock.sendMessage(from, { text: '🔄 Aggiornamento da GitHub...' })
            exec('git pull', (err, stdout) => {
                if (err) return sock.sendMessage(from, { text: `❌ Errore: ${err.message}` })
                sock.sendMessage(from, { text: `✅ Aggiornato!\n\n${stdout}` })
                process.exit() // Il bot si chiude, PM2 lo riavvierà
            })
        }
    }
}
st from = msg.key.remoteJid

        if (command === 'ping') {
            await sock.sendMessage(from, { text: '🏓 Pong!' })
        }

        if (command === 'aggiorna') {
            await sock.sendMessage(from, { text: '🔄 Aggiornamento da GitHub...' })
            exec('git pull', (err, stdout) => {
                if (err) return sock.sendMessage(from, { text: `❌ Errore: ${err.message}` })
                sock.sendMessage(from, { text: `✅ Aggiornato!\n\n${stdout}` })
                process.exit() // Il bot si chiude, PM2 lo riavvierà
            })
        }
    }
}
