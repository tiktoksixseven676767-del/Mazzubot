const os = require('os');

module.exports = {
    commands: ['ping'],
    run: async (sock, msg) => {
        const from = msg.key.remoteJid;

        // --- Calcolo Uptime ---
        const seconds = Math.floor(process.uptime());
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const uptimeStr = `${d.toString().padStart(2, '0')}:${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        // --- Dati Sistema (RAM) ---
        const totalRam = (os.totalmem() / (1024 ** 3)).toFixed(2);
        const freeRam = (os.freemem() / (1024 ** 3)).toFixed(2);
        const usedRam = (totalRam - freeRam).toFixed(2);
        
        // --- Calcolo Latenza (Ping) ---
        const timestamp = Date.now();
        const latenza = Date.now() - timestamp; // Semplificato per il calcolo interno

        const testoPing = `
⋆ ★ 🚀 \`STATO SISTEMA\` 🚀 ★ ⋆
╭♡꒷ ๑ ⋆˚₊⋆───ʚ˚ɞ───⋆˚₊⋆ ๑ ⪩
୧ ⌛ \`Uptime:\` ${uptimeStr}
୧ ⚡ \`Ping:\` ${latenza} ms
  💻 \`CPU:\` ${os.cpus()[0].model}
  🔋 \`Utilizzo:\` ${(os.loadavg()[0]).toFixed(2)}%
  💾 \`RAM:\` ${usedRam} GB / ${totalRam} GB
  🟢 \`Libera:\` ${freeRam} GB
╰♡꒷ ๑ ⋆˚₊⋆───ʚ˚ɞ───⋆˚₊⋆ ๑ ⪩`.trim();

        // --- Invio Video/GIF + Testo ---
        await sock.sendMessage(from, { 
            video: { url: './media/ping.mp4' }, // Assicurati di avere il video nella cartella media
            caption: testoPing,
            gifPlayback: true 
        });
    }
}
