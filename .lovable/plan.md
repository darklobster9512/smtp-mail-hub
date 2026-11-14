# Lead-Schnittstelle als Supabase-Funktion, ohne Cron, mit Sofort-Versand

## Was der „Ingest Key“ ist
Ein Passwort, das ein fremdes System beim Senden eines Leads mitschicken muss. Ohne Passwort könnte jeder im Internet Adressen an die Schnittstelle schicken, und deine Konten würden an diese Empfänger Mails senden. Das führt zu Spam-Vorwürfen und gesperrten Konten.

## Abweichung von deiner Vorgabe: Link statt Header-Key
Eine Schnittstelle völlig ohne Schutz baue ich nicht. Stattdessen steckt das Geheimnis **im Link selbst**. Du kopierst eine einzige Adresse, brauchst weder Header noch Secret, und das externe System ruft sie einfach per POST auf. Wer den Link nicht kennt, kann keine Leads einliefern. Per Knopf erzeugst du einen neuen Link, falls er je durchsickert.

## Was gebaut wird
1. **Supabase-Funktion `leads-ingest`** auf deinem Supabase-Projekt, Adresse: `https://htghprryiftbjfgieyag.supabase.co/functions/v1/leads-ingest?t=DEIN_TOKEN`. Sie ist öffentlich aufrufbar, prüft aber den Token im Link.
2. **Ablauf, sobald ein Lead eintrifft:**
   - Der Lead wird geprüft und mit Sendezeitpunkt „jetzt + Verzögerung“ gespeichert. Ist der Mindest-Abstand zum vorigen Lead noch nicht erreicht, wird der Zeitpunkt entsprechend verschoben.
   - Die Funktion antwortet sofort mit 201.
   - Im Hintergrund wartet sie bis zum Sendezeitpunkt und stößt dann den Versand an. Dafür ist kein Cron-Job nötig.
3. **Einstellbar** bleiben wie bisher: Verzögerung, Mindest-Abstand, Vorlage und Automatik an/aus unter Leads.
4. **Schutz gegen Doppelversand:** Eine E-Mail-Adresse, die schon als Lead existiert, wird nicht noch einmal angeschrieben. Die Antwort lautet dann `duplicate: true`.
5. **Sammel-Import:** Ein Aufruf darf einen Lead oder bis zu 100 Leads enthalten.
6. **Automatisierung-Seite** bekommt eine Karte „Lead-Schnittstelle“ mit:
   - dem fertigen Link (Kopieren-Knopf) und dem Knopf „Neuen Link erzeugen“
   - dem JSON-Format, Beispielaufruf, den Antworten und Fehlercodes
   - einem Test-Knopf
   - Die Karte „Externer Takt“ wird zu einer Notlösung, nur für sehr lange Verzögerungen.

## JSON-Format
```text
POST https://htghprryiftbjfgieyag.supabase.co/functions/v1/leads-ingest?t=DEIN_TOKEN
Content-Type: application/json

Ein Lead:
{ "email": "max@beispiel.de", "first_name": "Max", "last_name": "Mustermann", "source": "landingpage" }

Mehrere Leads:
{ "leads": [ { "email": "a@b.de" }, { "email": "c@d.de", "first_name": "Cora" } ] }

Antwort 201: { "accepted": 1, "duplicates": 0, "scheduled_at": "2026-11-14T15:20:30Z" }
Fehler: 401 Link falsch, 400 ungültiges JSON oder ungültige E-Mail, 413 mehr als 100 Leads
```
Pflicht ist nur `email`. `first_name`, `last_name` und `source` sind optional. Die Felder werden für `{first_name}`, `{last_name}` und `{anrede}` in der Vorlage genutzt.

## Grenzen, die du kennen solltest
- **Gesendet wird weiterhin von der App**, nicht in der Supabase-Funktion selbst. Supabase blockiert dort den SMTP-Port 587 und kennt weder den Proxy-Pool noch Resend-Konten. Die Funktion löst den Versand in der App aus, über einen internen Aufruf ohne Schlüssel. Er kann nur bereits geplante Leads senden, also keine neuen Empfänger erzeugen.
- **Die App muss veröffentlicht sein**, sonst ist dieser interne Aufruf nicht erreichbar.
- **Wartezeit:** Die Funktion kann höchstens etwa 2 Minuten warten. Ist die Verzögerung länger oder die Warteschlange voll, bleibt der Lead geplant und wird beim nächsten eintreffenden Lead oder bei geöffnetem Panel gesendet. Sonst hilft ein externer Cron.
- **Deploy-Vorbehalt:** Ob ich die Funktion von hier auf dein Supabase-Projekt ausrollen kann, prüfe ich als ersten Schritt. Geht es nicht, liegt dieselbe Logik als Route der App vor, mit Adresse auf der veröffentlichten Domain statt supabase.co. Das sage ich dir dann.

## Technische Details
- Migration:
  - `admin_settings`-Zeilen `leads_ingest_token` (zufällig, 40 Zeichen) und `app_base_url`; nur Admin lesbar/schreibbar wie bisher.
  - SQL-Funktion `ingest_leads(jsonb)` (nur service_role): Dedupe, Slot = `greatest(now()+delay, letzter geplanter Slot + gap)`, Advisory-Lock gegen parallele Aufrufe, gibt Zählung und `scheduled_at` zurück.
- `supabase/functions/leads-ingest/index.ts` (Deno): CORS, Token-Vergleich zeitkonstant, Zod-Validierung, `EdgeRuntime.waitUntil` mit Wartezeit bis `scheduled_at` (max. 120 s), dann `POST {app_base_url}/api/public/leads-send`. `verify_jwt = false` in `supabase/config.toml`.
- `src/routes/api/public/leads-send.ts`: ruft `runLeadsTick()` auf, ohne Eingabedaten, antwortet nur mit Zahlen.
- Entfernt: alte Route `/api/public/leads-ingest` mit `x-ingest-key`, `LEADS_INGEST_KEY`-Anzeige und der darauf basierende Test-Knopf; Test-Knopf ruft den neuen Link auf. `handleIngest`-Tests werden auf die neue Regel umgestellt (Schlüssel falsch → 401, Sendezeit = jetzt + Verzögerung, Abstand, Duplikat).
- UI: neue Karte in `admin.automation.tsx`, Token-Erzeugung per Browser-Client (Admin-RLS).
- Prüfung: Funktion per curl mit falschem und richtigem Token aufrufen und Leads-Tabelle prüfen, soweit das Projekt es zulässt.
