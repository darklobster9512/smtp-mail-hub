# Zweiter Kontotyp „Resend API“ neben SMTP

## Was du bekommst
1. **Konto anlegen/bearbeiten:** Oben eine Auswahl „SMTP“ oder „Resend API“.
   - SMTP: alle bisherigen Felder.
   - Resend: Label, API-Key (`re_…`), Absendername, Absender-E-Mail (Hinweis: muss eine in Resend verifizierte Domain sein), Klick-Domain, Tageslimit.
   - Beim Bearbeiten bleibt das Key-Feld leer: „leer lassen = unverändert“, genau wie beim SMTP-Passwort.
2. **Tabelle:** Neue Spalte „Typ“ mit Badge (SMTP grau, Resend schwarz mit neongelbem Rand). Statt Host:Port steht bei Resend der maskierte Key, z. B. `re_1…abcd`.
3. **Testmail** funktioniert für beide Typen, mit derselben seriösen Betreffliste und demselben Layout.
4. **Kampagnen und Auto-Leads** verteilen über alle aktiven Konten beider Typen gemischt. Tageslimit und „Heute gesendet“ gelten für beide gleich. Bei der Kampagnen-Kontoauswahl sind Resend-Konten mit Badge zu sehen.
5. **Bulk-Import** bleibt nur für SMTP.

## Fehlerregeln bei Resend
- **Key ungültig (401/403):** Das Konto wird auf „blocked“ gesetzt und ins Protokoll geschrieben. Die Mail geht über das nächste Konto raus, der Empfänger gilt nicht als fehlgeschlagen.
- **Zu viele Anfragen (429):** Das Konto pausiert 60 Sekunden, die anderen Konten senden weiter. Der Empfänger bleibt offen.
- **Andere Ablehnung (z. B. 422, Absender nicht verifiziert):** Der Empfänger wird mit der genauen Resend-Meldung als fehlgeschlagen markiert.

## Abweichungen von deiner Vorgabe
- **Kein Proxy für Resend:** Resend-Mails gehen direkt über HTTPS raus. Resend verschickt die Mail ohnehin von den eigenen Servern, deshalb bringt ein Proxy hier nichts für die Absender-IP. Der Proxy-Pool gilt weiter nur für SMTP.
- **Der API-Key ist im Browser nicht lesbar**, genau wie SMTP-Passwörter. Für die maskierte Anzeige speichert die Datenbank automatisch nur Anfang und Ende des Keys mit.
- **Badge-Farbe:** Schwarz mit Neongelb statt Lila, passend zur festgelegten Farbregel.
- Es gibt keinen nodemailer. Der SMTP-Weg bleibt der bestehende Versand inklusive Proxy.

## Hinweis
Der vorige Plan zur Proxy-Sperre (SMTP-Port-Test, klarere Meldung) ist noch nicht umgesetzt. Ich setze nur diesen Plan um. Sag Bescheid, wenn der andere danach kommen soll.

## Technische Details
- Migration auf `smtp_accounts`:
  - `provider text not null default 'smtp'` mit Check `smtp|resend`.
  - `api_key text` und `api_key_hint text`.
  - `host` und `user_email` dürfen leer sein. Ein Check verlangt sie bei SMTP und `api_key` bei Resend.
  - Trigger füllt `api_key_hint`.
  - Spaltenrechte: `authenticated` bekommt auf `api_key` kein SELECT, nur INSERT/UPDATE (wie bei `password`).
- `src/lib/mail-send.server.ts`: zentrales `createMailer()` mit `send(acc, msg)`.
  - Platzhalter-Ersetzung bleibt vor dem Aufruf, also gleich für beide Typen.
  - Bei SMTP geht es an `createSender()`, bei Resend per `fetch` an `https://api.resend.com/emails`.
  - Neuer Fehlertyp `ResendError(kind: auth|rate|reject)`.
- `campaign-sender.server.ts`, `leads-sender.server.ts`, `smtp.functions.ts` nutzen nur noch diese Funktion.
  - auth: Konto wird blockiert, Wahl des nächsten Kontos.
  - rate: Konto 60 s im Lauf pausiert, Empfänger bleibt offen.
  - Absender-Fallbacks ohne `host`.
- UI: `AccountDialog` (Provider-Select, bedingte Felder, Schema je Typ), `admin.accounts.tsx` (Typ-Spalte, maskierter Key), `SendDialog`, Kampagnen-Detail und Leads-Anzeige mit `label ?? host ?? "Resend"`.
- Tests:
  - Status 401/403/429/422 werden richtig zugeordnet (mit gemocktem fetch).
  - Rotation: ein blockiertes oder pausiertes Konto wird übersprungen.
  - Key-Maskierung.
- `AGENTS.md`: Regel zum zentralen Versand über beide Typen aktualisieren.
