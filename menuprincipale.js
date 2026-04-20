sock.ev.on('messages.upsert', async m => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    // Estrae il testo del messaggio
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const from = msg.key.remoteJid;
    const prefix = "."; // Il tuo prefisso
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : null;

    // Logica dei comandi
    switch (command) {
        case 'menu':
            const testoMenu = `
🤖 *MAZZUBOT - MENU* 🤖

Ciao *${msg.pushName}*! Ecco i comandi disponibili:

* ${prefix}menu - Mostra questa lista
* ${prefix}aggiorna - Aggiorna il bot (Admin)

---
_Mazzubot v1.0 - Powered by GitHub_
            `.trim();

            await sock.sendMessage(from, { 
                text: testoMenu,
                // Aggiunge un piccolo "footer" se vuoi renderlo più elegante
                contextInfo: {
                    externalAdReply: {
                        title: "Mazzubot Menu",
                        body: "Seleziona un'opzione",
                        previewType: "PHOTO",
                        thumbnailUrl: "https://github.com/fluidicon.png", // Icona GitHub come esempio
                        sourceUrl: "https://github.com/" // Link al tuo profilo GitHub
                    }
                }
            });
            break;

        case 'aggiorna':
            // Qui inserisci il codice per git pull che abbiamo fatto prima
            break;
    }
});
