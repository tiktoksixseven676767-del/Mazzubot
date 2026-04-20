    if (!sock.authState.creds.registered) {
        console.log("--- CONFIGURAZIONE MAZZUBOT ---")
        const phoneNumber = await question('Inserisci il numero (es. 39333...): ')
        
        console.log("⏳ Attendo che la connessione sia pronta...")
        await delay(10000) // Cambia da 3000 a 10000 (10 secondi)
        
        try {
            const code = await sock.requestPairingCode(phoneNumber.trim())
            console.log(`\n✅ CODICE: ${code}\n`)
        } catch (err) {
            console.error("Errore: la connessione è stata chiusa troppo presto. Riprova.")
        }
    }
