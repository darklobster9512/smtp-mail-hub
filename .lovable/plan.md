# Warum "gesendet", aber keine Mail ankommt

## Was feststeht
- Der Lead an igor.maier@web.de ging um 10:12 über das Konto support@aqar-chat.com (Hostinger, Port 465) raus.
- "Gesendet" heißt: Hostinger hat die Mail angenommen. Was danach passiert, sieht die App aktuell nicht.
- Die Domain aqar-chat.com hat SPF und DMARC. Eine Hostinger-DKIM-Signatur habe ich unter dem üblichen Namen nicht gefunden. web.de ist streng und verwirft solche Mails oft stillschweigend oder schickt eine Rückläufer-Mail.

## Was du sofort prüfen kannst
1. Melde dich im Postfach support@aqar-chat.com an (Hostinger Webmail) und schau nach einer Rückläufer-Mail ("Undelivered", "Mail delivery failed") – darin steht der genaue Grund.
2. Schick über Bulk-Test dieselbe Testmail an eine Gmail-Adresse. Kommt sie dort an, liegt es an web.de.
3. In Hostinger unter E-Mails → DNS/DKIM prüfen, ob DKIM aktiv ist.

## Was ich in der App einbaue
- Die Antwort des Mailservers (z. B. "250 OK queued as …") wird beim Lead und im Aktivitätsprotokoll gespeichert und in der Leads-Tabelle beim Status angezeigt. Damit hast du einen Nachweis für den Support von Hostinger.
- Auf /admin/accounts eine Schaltfläche "Zustellbarkeit prüfen" pro Konto: zeigt, ob SPF, DKIM und DMARC der Absender-Domain gesetzt sind (grün/rot mit kurzer Erklärung).

## Technische Details
- Vendored worker-mailer: letzte SMTP-Antwort nach DATA zurückgeben; `mail-send.server.ts` reicht sie als `serverReply` durch (Resend: message id).
- Neue Spalte `leads.server_reply text` + Eintrag in `mail_logs` vom Typ info.
- DNS-Prüfung per Server-Funktion über DNS-over-HTTPS (cloudflare-dns.com), DKIM mit gängigen Selektoren (hostingermail1/2, default, google, selector1/2, resend).
