module.exports = {
    commands: ['menu', 'help'],
    run: async (sock, msg) => {
        const from = msg.key.remoteJid
        const menu = `
🤖 *MAZZUBOT - MENU* 🤖

• *.menu* : Mostra questa lista
• *.ping* : Controlla se il bot risponde
• *.aggiorna* : Sincronizza con GitHub

_Versione Plugin 1.0_`
        await sock.sendMessage(from, { text: menu.trim() })
    }
}
