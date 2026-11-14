# Finale Verbesserungen am Admin-Panel

## 1. Testmail mit klickbarem Link
- Die Testmail enthält einen echten Link `https://{klick_domain}` (plus Hinweis, falls im Konto keine Klick-Domain eingetragen ist). So lässt sich prüfen, ob die Verlinkung ankommt und nicht als Spam markiert wird.

## 2. Bulk-Import für SMTP-Konten
- Neuer Button „Bulk-Import" auf der Seite E-Mail-Konten, öffnet ein Fenster mit:
  - Textfeld, eine Zeile pro Konto. Unterstützt `host:port:user:passwort` und `host;port;user;passwort`. Doppelpunkte oder Semikolons im Passwort sind erlaubt, alles nach dem dritten Trenner zählt als Passwort
  - Gemeinsame Felder: Absendername, Klick-Domain, Tageslimit (Standard 1500)
  - Live-Vorschau: „X gültig, Y fehlerhaft (Zeile n: Grund), Z doppelt"
- Doppelte Konten (gleicher Host + Login) werden übersprungen, sowohl innerhalb des Textes als auch gegenüber bereits gespeicherten Konten
- Alle gültigen Konten werden in einem Schritt angelegt (Absender-E-Mail = Login). Danach kommt eine Meldung „X angelegt, Y übersprungen"

## 3. Mobil nutzbar überall
- Tabellen scrollen auf kleinen Bildschirmen seitlich statt zu quetschen (Mindestbreite, kein Umbruch in Kurzspalten)
- Die Seitenleiste ist auf dem Handy ein ausklappbares Menü und schließt sich nach Auswahl eines Menüpunkts automatisch
- Kopfzeilen mit Buttons (Titel + „Konto hinzufügen" usw.) brechen sauber um, Abstände auf dem Handy kleiner, Dialoge scrollbar
- Geprüft per Screenshot bei Handy-Breite (Login und Startseite, Admin-Bereich soweit ohne Anmeldung möglich)

## 4. Fehlerbehandlung und Meldungen
- Eigene Fehlerseite im Admin-Bereich: verständliche Meldung + „Erneut versuchen" + „Zur Übersicht", statt einer leeren Seite
- Einheitliche Hilfsfunktion für Meldungen: Datenbank-Fehler werden in klares Deutsch übersetzt (z. B. „Keine Berechtigung", „Eintrag existiert bereits", „Keine Verbindung")
- Alle Speichern/Löschen/Senden-Aktionen zeigen eine eindeutige Erfolg- oder Fehlermeldung; Fehler beim Laden der Listen werden ebenfalls angezeigt

## 5. Leads live aktualisieren
- Die Lead-Tabelle und die Zahlen darüber aktualisieren sich sofort, wenn ein Lead hinzukommt oder sich sein Status ändert (z. B. „gesendet")
- Neue Leads erzeugen zusätzlich eine kurze Meldung „Neuer Lead: …"

## Technische Details
- `smtp.functions.ts`: HTML um `<a href="https://${klick_domain}">` erweitern (Domain escapen).
- `src/lib/smtp-import.ts`: `parseSmtpLines(text)` → valid/invalid/duplicates; Port 1–65535, E-Mail-Regex. Insert per Browser-Client (RLS admin) als ein `insert([...])`; vorhandene Konten (host, user_email) vorher geladen. Tests in `src/test/smtp-import.test.ts` (beide Formate, Passwort mit Doppelpunkt, Duplikate, ungültiger Port).
- `components/admin/accounts/BulkImportDialog.tsx`.
- `DataTable`: `min-w-[640px]`, `whitespace-nowrap` für Kopfzeilen; `main` `p-4 sm:p-6`; AdminSidebar `setOpenMobile(false)` bei Klick; Kopfzeilen auf Grid/Flex-Wrap umstellen.
- `src/lib/notify.ts`: `notifyError(err, fallback)` / `notifySuccess(msg)` mit Fehler-Übersetzung; bestehende `toast.error(error.message)` ersetzen.
- `errorComponent` auf der Admin-Layout-Route (mit `router.invalidate()` zum Wiederholen).
- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.leads` (RLS bleibt: nur Admins erhalten Ereignisse). In `admin.leads.tsx` ein Kanal-Abo auf `postgres_changes` für `leads`, das die Lead-Abfragen neu lädt; Abo beim Verlassen der Seite beenden. Das 15-Sekunden-Nachladen fällt weg.
