# Lead "pitzgertraude@gmail.com" bleibt auf "Geplant"

## Was los ist
- Der Lead kam um 11:21 rein und sollte um 11:22 raus.
- Seitdem schlägt jeder Versuch fehl, über alle Konten (insqar, aqar-chat, mwe-das, visolutions, ...).
- Der Fehler ist immer derselbe: "Cannot call releaseLock() on a reader with outstanding read promises".
- Er kommt aus unserer App, nicht vom Mailserver. Er passiert beim Wechsel auf die verschlüsselte Verbindung über den Proxy (STARTTLS, Port 587).
- Mein letzter Fix hat nur unsere eigene Proxy-Schicht abgesichert. Die Stelle im Mail-Baustein selbst, die beim Wechsel ebenfalls die Leseverbindung freigibt, wirft weiter.
- Weil jeder Versuch scheitert, wird der Lead nie "fehlgeschlagen" und bleibt ewig "Geplant".

## Was ich ändere
1. **Fehler nachstellen:** ein lokaler Test mit nachgebautem Proxy und Mailserver mit STARTTLS (Port 587) und direktem TLS (Port 465), genau wie auf deinem Server (Node 22).
2. **Wechsel auf Verschlüsselung reparieren:** im Mail-Baustein den alten Lesekanal sauber beenden statt hart freizugeben, damit kein offener Lesevorgang mehr stört. Die Proxy-Verbindung übergibt die Leitung erst, wenn nichts mehr gelesen wird.
3. **Kein endloses "Geplant":** nach 5 gescheiterten Runden wird der Lead auf "Fehlgeschlagen" gesetzt, mit Fehlertext. Du kannst ihn dann neu planen.
4. **Erneut versuchen:** Button pro Lead, um einen fehlgeschlagenen Lead wieder einzuplanen.
5. Test laufen lassen, danach einen echten Versand über den xmailer-Proxy prüfen.

## Danach auf deinem Server
`cd ~/smtp-mail-hub && git pull && npm install && pm2 restart smtp-mail-hub`

## Technische Details
- Betroffen: `src/lib/vendor/worker-mailer.mjs` (`tls()`: `reader.cancel()`/try-catch statt `releaseLock()`), `src/lib/proxy-socket.server.ts` (Wrapper-Readable: ausstehendes Pull beim `startTls` auflösen), `src/lib/leads-sender.server.ts` (Versuchszähler, Status `failed`).
- Neue Spalte `leads.attempts int default 0` per Migration.
- Test: `src/test/proxy-starttls.test.ts` mit Node-Shim, Fake-HTTP-CONNECT/SOCKS5-Proxy und Fake-SMTP mit STARTTLS.
