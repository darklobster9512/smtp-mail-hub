# Die 5 offenen Punkte aus der Prüfung beheben

## 1. Schlüssel für die Lead-Schnittstelle + Test-Button
- **Anleitung (kommt in der Antwort):** In Lovable oben auf den Projektnamen → Settings → Secrets → „Add secret“, Name `LEADS_INGEST_KEY`, Wert = langer Zufallswert (z. B. aus einem Passwort-Generator, 40+ Zeichen). Denselben Wert bekommt dein externes System als Header `x-ingest-key`. Hinweis: Der Schlüssel gehört zu den Secrets des Lovable-Projekts, nicht zu den Edge-Function-Secrets im Supabase-Dashboard. Die App liest ihn dort, Supabase kennt ihn nicht.
- **Button „Schnittstelle testen“ auf der Leads-Seite:** Der Server ruft die eigene Adresse `/api/public/leads-ingest` mit dem hinterlegten Schlüssel und einem Test-Lead auf (`integration-test@example.com`, Quelle „integration-test“). Angezeigt werden der Status (201 = läuft, 401 = Schlüssel fehlt/falsch) und die Antwort. Der Schlüsselwert erscheint nie im Browser.
- Damit der Test-Lead keine echte Mail auslöst, wird er nach erfolgreichem Test direkt wieder gelöscht.

## 2. Schnittstellen-Leads immer „geplant“
- Leads von außen bekommen immer den Status „geplant“ mit Sendezeit = jetzt + Verzögerung, egal ob die Automatik an ist
- „neu“ gibt es nur noch für manuelle Leads ohne Häkchen „Auto-Kampagne auslösen“
- Ist die Automatik aus, bleibt alles „geplant“ und wird nicht verschickt. Nach dem Einschalten werden die fälligen Leads abgearbeitet. Das gilt auch für „Jetzt alle offenen senden“: der Button meldet dann „Automatik ist ausgeschaltet“

## 3. Versand-Takt ohne externen Dienst
- Solange irgendeine Admin-Seite offen ist, läuft automatisch einmal pro Minute ein Versand-Schritt für Kampagnen und Leads. Das ersetzt die bisherigen Einzel-Schleifen auf der Kampagnen- und Leads-Seite. Auf der geöffneten Kampagnen-Detailseite bleibt der schnellere Takt
- Parallel-Schutz ist schon vorhanden: eine Sperr-Zeile in den Admin-Einstellungen mit Ablaufzeit (90 s). Läuft schon ein Schritt, wird der zweite übersprungen. Die Sperre wird nach jedem Schritt freigegeben. Ein Empfänger wird erst nach erfolgreichem Versand als „gesendet“ markiert, ein Lead ebenso
- **Box „Externer Takt“ auf der Seite Automatisierung** mit Kopier-Button:
  `curl -X POST https://project--1304ce56-0e4b-4c22-ad0a-6a07b2dd78c9.lovable.app/api/public/campaign-tick -H "x-cron-secret: DEIN_CRON_SECRET"`
  Dazu der Hinweis: nur nötig, wenn niemand das Panel offen hat; bei cron-job.org „jede Minute“, Methode POST, Header eintragen. Der Schlüssel kommt als Header, nicht in die Adresse, weil Adressen in Logs landen

## 4. Schlüssel-Status sichtbar
- Auf der Seite Automatisierung: `LEADS_INGEST_KEY` hinterlegt ✓/✗, `CRON_SECRET` hinterlegt ✓/✗. Geprüft wird nur, ob ein Wert existiert, nie der Wert selbst. Nur für den Admin

## 5. Hilfe-Box zur Anmeldung
- Auf der Seite Automatisierung (und dezent unter dem Login-Formular, falls die Anmeldung fehlschlägt): „Anmeldung klappt nicht? Im Supabase-Dashboard Authentication → Sign In / Providers → Email aktivieren; für schnelle Tests ggf. ‚Confirm email‘ ausschalten.“

## Technische Details
- `leads-ingest.ts`: Status fest `scheduled`. `runLeadsTick`: bricht mit `reason: "disabled"` ab, wenn `auto_campaign_enabled` false ist.
- `leads.functions.ts`: `testIngest` (Admin; Origin aus `getRequest()`; fetch mit Header; bei 201 Test-Lead per Admin-Client löschen; gibt `{status, body}` zurück), `getSecretStatus` (Admin; `Boolean(process.env[...])`), `runBackgroundTick` (Admin; `runTick(25000)` dann `runLeadsTick(15000)`).
- Admin-Layout `admin.tsx`: 60-s-Intervall mit `runBackgroundTick`, solange der Tab sichtbar ist; Lead-Seiten-Schleife entfernt.
- Automatisierungs-Seite neu: Status-Liste, Takt-Box, Hilfe-Box.
- Test `src/test/leads-ingest.test.ts`: ohne Schlüssel → 401; gültiger Lead → Status `scheduled`, Zeitpunkt = jetzt + Verzögerung (Datenbank gemockt).
