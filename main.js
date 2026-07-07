async function startBot() {
  if (!isPluginsLoaded) {
    await loadPlugins();
    await initSession(); 
    isPluginsLoaded = true;
  }
  
  const sessionDirectory = CONFIG.SESSION_DIR || 'session';
  console.log(`📦 Initializing multi-file authentication state using path: "./${sessionDirectory}"`);
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionDirectory);
  
  // 🔄 Changed level from 'silent' to 'warn' or 'info' to catch hidden exceptions
  const sock = makeWASocket({
    logger: pino({ level: 'info' }), 
    auth: state,
    printQRInTerminal: false
  });

  console.log('📡 Registering core system event listeners onto socket connection interface...');

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // Log EVERY single state transition explicitly
    console.log(`⚡ [CONNECTION STATE UPDATE]: ${connection || 'processing state change...'}`);
    
    if (qr) {
      console.log('⚠️ [QR CODE GENERATED]: A live Session ID was not found or has expired.');
      QRCode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`❌ Connection terminated. Reason Status Code: ${statusCode}`);
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('🔄 Re-attempting core socket boot sequence...');
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot successfully connected to WhatsApp via Session ID!');
      
      try {
        const ownerNumber = "917866052212"; 
        const ownerJid = `${ownerNumber}@s.whatsapp.net`;
        
        const liveAlert = `🚀 *LuffyTaro Bot is Live and Operational!* \n\nUse *${CONFIG.PREFIX}menu* to view your active command systems.`;
        await sock.sendMessage(ownerJid, { text: liveAlert });
        console.log(`Dispatched startup notice successfully to: ${ownerJid}`);
      } catch (err) {
        console.error('⚠️ Failed to deliver live notification alert to owner:', err.message);
      }
    }
  });

  sock.ev.on('creds.update', () => {
    console.log('💾 Authentication credentials updated and synchronized to disk storage layer.');
    saveCreds();
  });

  // Keep the rest of your messages.upsert and group router exactly the same...
