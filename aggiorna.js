const { exec } = require('child_process')

module.exports = {
    // Il comando che attiva questo plugin
    commands: ['aggiorna'],
    
    run: async (sock, msg, { body }) => {
        const from = msg.key.remoteJid
        
        // Messaggio iniziale per dare feedback all'utente
        await sock.sendMessage(from, { 
            text: '🔄 *Mazzubot sta controllando gli aggiornamenti su GitHub...*' 
        })

        // Esegue il comando git pull per scaricare i nuovi file
        exec('git pull', async (err, stdout, stderr) => {
            if (err) {
                return await sock.sendMessage(from, { 
                    text: `❌ *Errore durante il pull:* \n\n${err.message}` 
                })
            }

            // Se Git risponde che è già aggiornato
            if (stdout.includes('Already up to date')) {
                return await sock.sendMessage(from, { 
                    text: '✅ *Il bot è già aggiornato all\'ultima versione.*' 
                })
            }

            // Se ci sono stati cambiamenti, informa l'utente e riavvia
            await sock.sendMessage(from, { 
                text: `✅ *Aggiornamento completato!*\n\n*Log:* \n${stdout}\n\nIl bot si sta riavviando per applicare le modifiche...` 
            })

            // Piccola pausa per assicurarsi che il messaggio venga inviato prima di chiudere
            setTimeout(() => {
                process.exit() 
                // Se usi PM2 (consigliato su Termux), il bot si riaccenderà istantaneamente.
            }, 2000)
        })
    }
}
