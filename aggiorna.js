const { exec } = require('child_process');

sock.ev.on('messages.upsert', async m => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const from = msg.key.remoteJid;

    if (body === '.aggiorna') {
        await sock.sendMessage(from, { text: '🔄 *Aggiornamento in corso...* scarico i nuovi file da GitHub.' });

        // Esegue il comando git pull
        exec('git pull', async (err, stdout, stderr) => {
            if (err) {
                return await sock.sendMessage(from, { text: `❌ Errore durante l'aggiornamento:\n${err.message}` });
            }
            
            await sock.sendMessage(from, { text: `✅ *Aggiornamento completato!*\n\n*Log:* ${stdout}\n\nIl bot si sta riavviando...` });

            // Forza la chiusura del processo. 
            // Se usi PM2, il bot verrà riavviato automaticamente con il nuovo codice.
            process.exit();
        });
    }
});
