# Proxy lehnt SMTP-Verbindung ab: Diagnose und bessere Fehlerführung

## Was der Fehler bedeutet
Die Meldung "Proxy-Tunnel abgelehnt: Verbindung nicht erlaubt" kommt direkt vom Proxy-Anbieter (SOCKS5-Antwortcode 2, "connection not allowed by ruleset"). Die Anmeldung beim Proxy `us-rpool.proxied.com:11001` hat also geklappt. Erst als die App den Tunnel zum Mailserver (SMTP-Port 465 oder 587) angefordert hat, hat der Proxy das verweigert.

Sehr wahrscheinlich sperrt der Anbieter SMTP-Ports. Das ist bei Residential-/Rotating-Proxys üblich, um Spam zu verhindern. Das ist noch nicht bestätigt: Ich konnte ihn nicht mit deinen Zugangsdaten testen. Der Fehler liegt damit mit hoher Wahrscheinlichkeit nicht im App-Code, und die App kann ihn nicht umgehen. Der Exit-IP-Test läuft über Port 443 und kann deshalb trotzdem grün sein.

## Geplante Änderungen
1. **SMTP-Test je Proxy:** Neben "Exit-IP testen" kommt ein Knopf "SMTP-Port testen". Er öffnet über den Proxy nur eine Verbindung zum Mailserver des gewählten SMTP-Kontos, ohne Anmeldung und ohne Mail, und liest den Server-Gruß. So siehst du vor dem Versand, ob der Anbieter Port 465/587 durchlässt.
2. **Klarere Fehlermeldung:** Bei dem Fehler "Verbindung nicht erlaubt" oder HTTP 403 zeigt die App einen Hinweis. Er sagt, dass der Proxy-Anbieter diesen SMTP-Port blockiert, und dass du bei ihm SMTP freischalten lassen oder einen Proxy-Typ ohne SMTP-Sperre nehmen musst (zum Beispiel dedizierte oder ISP-Proxys).
3. **Fehlerzähler nur bei Verbindungsproblemen:** Eine Ablehnung des Ziels durch den Anbieter ist eine Regelsperre und kein Ausfall. Sie zählt nicht in die 5 Fehler, die einen Proxy deaktivieren. Sonst wird dein Proxy bei jedem Testversuch ohne echten Defekt abgeschaltet.
4. **Kein stilles Senden von der Server-IP:** Aktuell geht die Mail direkt raus, wenn der Pool an ist, aber kein Proxy aktiv ist. Das widerspricht dem Zweck des Pools. Künftig bricht der Versand dann mit einer klaren Meldung ab, und die Warnung auf der Proxy-Seite wird entsprechend angepasst. Kampagnen und Auto-Leads bleiben in dem Fall offen.
5. **Tests:** Je ein Test für Code 2 (kein Zähler, klare Meldung), für den leeren aktiven Pool (kein Direktversand) und für den SMTP-Port-Test über einen lokalen Proxy.

## Was du sofort tun kannst, ohne Änderung
- Frage den Anbieter oder prüfe seine Dokumentation, ob SMTP (Port 465/587) erlaubt ist.
- Alternativ den Pool-Schalter ausschalten. Dann sendet die App direkt von der Server-IP.

## Technische Details
- `src/lib/proxy-socket.server.ts`: eigener Fehlertyp für Regelsperre (SOCKS-Code 2 oder HTTP 403) neben dem Verbindungsfehler. Neue Funktion `probeSmtpPort(proxy, host, port, mode)`.
- `src/lib/proxy-retry.ts` und `src/lib/smtp-transport.server.ts`: Regelsperre ohne Wiederholung und ohne Zähler. Bei aktivem Pool ohne aktiven Proxy wird ein Fehler geworfen statt direkt zu verbinden. Dafür ist wahrscheinlich eine kleine Migration am Auswahl-RPC nötig, weil er "Pool aus" und "Pool an, aber leer" nicht unterscheidet.
- `src/lib/proxies.functions.ts`: neue admin-geprüfte Funktion für den SMTP-Port-Test.
- `src/routes/_authenticated/admin.proxies.tsx`: neuer Knopf mit Auswahl des SMTP-Kontos und angepasster Hinweistext.
- `src/lib/campaign-sender.server.ts` und `src/lib/leads-sender.server.ts`: Empfänger bleiben bei dem Fehler offen und werden nicht als fehlgeschlagen markiert.
