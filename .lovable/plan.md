# SMTP-Konten verwalten (/admin/accounts)

## Funktionen
1. **Tabelle**
   - Spalten: Label, Host:Port, Absender-E-Mail, Klick-Domain, „Heute gesendet“ als Badge (z. B. 120 / 1500), Status und Erstellt-am.
   - Status: active = grün, blocked = rot.
   - Je Zeile drei Aktionen: Testmail, Bearbeiten, Löschen.
   - 25 Einträge pro Seite mit Vor/Zurück und Seitenanzeige.
2. **„Konto hinzufügen“** öffnet ein Fenster mit allen Feldern:
   - Label, Host, Port (Vorgabe 587, Hinweis „465 = implizites TLS, 587 = STARTTLS“), SMTP-Benutzer, Passwort, Absendername, Absender-E-Mail, Klick-Domain, Tageslimit.
   - Absender-E-Mail übernimmt automatisch den SMTP-Benutzer, solange du sie nicht änderst.
   - Unter Klick-Domain steht der Hinweis, dass sie in Vorlagen als {klick_domain} ersetzt wird.
   - Pflichtfelder werden geprüft und Fehler am Feld angezeigt.
3. **Bearbeiten**: dasselbe Fenster, vorausgefüllt, zusätzlich mit Status-Auswahl (active/blocked). Das Passwortfeld bleibt leer mit dem Hinweis „leer lassen = unverändert“; nur ein neu eingegebenes Passwort wird gespeichert.
4. **Löschen** mit Sicherheitsabfrage.
5. **Testmail**: Ein kleines Fenster pro Zeile mit Empfänger-Feld (E-Mail-Format wird geprüft) und Senden-Button.
   - Betreff „Test“, einfacher HTML-Text mit Kontoname, Server, Absender und Klick-Domain.
   - Erfolg oder die genaue Fehlermeldung des Mailservers erscheint als Hinweis.
   - Jeder Versuch wird zusätzlich in den Mail-Logs festgehalten.

## Abweichung von deiner Vorgabe
- **Server-Funktion der App statt Supabase-Edge-Function**
  - Der Testversand läuft als Server-Funktion direkt in der App; das ist hier der vorgesehene Weg, und sie wird mit der App veröffentlicht.
  - Edge-Functions blockieren außerdem ausgehende Verbindungen auf Port 587, Testmails über STARTTLS-Konten würden dort also scheitern.
  - Es kommt eine für diese Laufzeit gebaute SMTP-Bibliothek zum Einsatz statt nodemailer, mit demselben Verhalten: 465 = TLS, sonst STARTTLS.
- **Kein Aufruf nur mit dem öffentlichen Schlüssel**
  - Dann könnte jeder über deine Konten beliebige Mails verschicken.
  - Die Funktion prüft stattdessen, dass der Aufrufer eingeloggt und Admin ist. Aus dem Admin-Panel funktioniert das ohne Zusatzaufwand.

## Technische Details
- `bun add worker-mailer` (nutzt `cloudflare:sockets`, unterstützt `secure`/`startTls`, AUTH PLAIN/LOGIN).
- `src/lib/smtp.functions.ts`: `sendTestMail` (POST) mit diesen Schritten:
  - `requireSupabaseAuth`, dann Admin-Prüfung per `has_role`-RPC.
  - zod-Validierung von `account_id` (uuid) und `test_email_to` (E-Mail).
  - Konto inkl. Passwort per `supabaseAdmin` laden (dynamischer Import im Handler).
  - Mail senden; Rückgabe `{ success, error? }`.
  - Eintrag in `mail_logs`.
- `src/start.ts`: Bearer-Middleware (`attachSupabaseAuth`) für Server-Funktionen ergänzen, falls `auth-attacher` fehlt, minimal selbst anlegen.
- CRUD im Browser über den Supabase-Client (Zeilenschutz: nur Admin):
  - Lesen ohne `password`-Spalte.
  - Insert/Update ohne `.select()` (das Passwort ist nicht lesbar).
  - Pagination über `.range()` + `count: "exact"`.
- UI: Dialog, AlertDialog, react-hook-form + zod, sonner-Toasts; Datei `admin.accounts.tsx` plus Komponenten unter `src/components/admin/accounts/`.
