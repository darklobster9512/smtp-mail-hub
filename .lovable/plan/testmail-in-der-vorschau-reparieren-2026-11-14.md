# Testmail in der Vorschau reparieren

## Ursache
Der Mail-Versand nutzt eine Verbindungsfunktion, die es nur auf dem echten Server der veröffentlichten App gibt. Die Vorschau läuft auf einem anderen Server, dem diese Funktion fehlt, daher die Meldung „Cannot find module 'cloudflare:sockets'“. Betroffen sind Testmails, Kampagnen und Lead-Mails, aber nur in der Vorschau. In der veröffentlichten App ist die Funktion vorhanden.

## Lösung
- Nur für die Vorschau wird ein kleiner Ersatz für diese Verbindungsfunktion eingebaut. Er bildet sie mit den Standard-Netzwerkfunktionen der Vorschau nach: Verbindung, TLS bei Port 465, STARTTLS bei 587, Lesen/Schreiben, Schließen
- Die veröffentlichte App bleibt unverändert und nutzt weiter die echte Funktion; der Ersatz landet nicht in der veröffentlichten Version
- Danach Testmail, Kampagnen und Lead-Versand auch in der Vorschau nutzbar
- Prüfung: Ein Skript stellt über den Ersatz eine echte Verbindung zu einem öffentlichen Mailserver her (Begrüßung + STARTTLS, ohne Anmeldung, ohne Mail) und bestätigt, dass die Fehlermeldung verschwunden ist. Den echten Versand prüfst du mit deinem Konto

## Technische Details
- `src/dev/cloudflare-sockets-shim.ts`: `connect({hostname, port}, {secureTransport})` mit `node:net`/`node:tls`; Rückgabe `{ opened, readable, writable, closed, close(), startTls() }` über `stream.Readable.toWeb`/`Writable.toWeb`; `startTls()` wrapped den bestehenden Socket mit `tls.connect({ socket, servername })`.
- `vite.config.ts`: kleines Plugin mit `apply: "serve"`: `config()` setzt `ssr.noExternal: ["worker-mailer"]` (nicht `external`), `resolveId("cloudflare:sockets")` → Shim. Build bleibt unberührt.
- AGENTS.md-Regel: Dev-Shim für cloudflare:sockets nur im Dev-Server; Produktion nutzt workerd nativ.
