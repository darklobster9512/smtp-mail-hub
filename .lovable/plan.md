# Proxy-Test "xmailer": Fehler "releaseLock() ... outstanding read promises" beheben

## Was passiert
Der Test-Button ruft eine HTTPS-Abfrage (api.ipify.org) durch den Proxy auf. Nach dem Proxy-Handshake wird die Verbindung auf TLS umgeschaltet; dabei wird die Lesesperre der Leitung freigegeben. Liegt in dem Moment noch eine offene Leseanfrage vor, bricht die Laufzeit mit genau dieser Meldung ab. Die Meldung ist nicht mit "Proxy …:" versehen, kommt also nach dem erfolgreichen Proxy-Handshake – der Proxy selbst funktioniert, der Fehler liegt in unserem Code. Welche Stelle exakt auslöst (TLS-Umschaltung oder Abbruch bei Zeitüberschreitung), ist noch nicht bestätigt.

## Schritte
1. Fehler mit dem gespeicherten xmailer-Proxy lokal nachstellen und die genaue Stelle bestimmen.
2. Proxy-Tunnel robust machen:
   - Lesesperre nie mit offener Leseanfrage freigeben: Handshake-Lesen so umbauen, dass vor der TLS-Umschaltung garantiert nichts mehr aussteht (bzw. ausstehende Leseanfrage zuerst abschließen/abbrechen).
   - Bei Zeitüberschreitung/Fehler Verbindung sauber schließen statt Sperre freizugeben.
   - Gleiche Absicherung für die STARTTLS-Umschaltung beim echten Mailversand (Port 587).
3. Verständliche Fehlermeldung, falls der Proxy z. B. Port 443 blockiert.
4. Test ergänzen, der eine verzögerte/gesplittete Proxy-Antwort simuliert, und erneut gegen den xmailer-Proxy prüfen.

## Technisch
- Betroffen: `src/lib/proxy-socket.server.ts` (`openTunnel` Zeile ~190, `wrap().startTls` ~150, `fetchExitIp`).
