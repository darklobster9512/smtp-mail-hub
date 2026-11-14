# Leads-Management + Automatisierung unter /admin/leads

## Was gebaut wird

**1. Einstellungs-Panel (oben)**
- Schalter "Automatischer Kampagnenversand bei neuem Lead"
- Verzögerung (Sekunden nach Lead-Eingang), Mindest-Abstand zwischen zwei Auto-Mails
- Standard-Vorlage: Auswahl aus allen Kampagnen im Status "Entwurf"
- Statistik: Leads gesamt, Auto-Mails heute, geplant, nächste geplante Zeit
- Button "Jetzt alle offenen senden"

**2. Lead-Tabelle**
- E-Mail, Vorname, Nachname, Quelle, Status (neu=grau, geplant=gelb mit Uhrzeit, gesendet=grün mit Konto-Name, fehlgeschlagen=rot)
- Zeitraum-Filter (24 h / Woche / alle), 25 pro Seite

**3. Lead manuell anlegen** (Dialog)
- E-Mail (geprüft), Vorname, Nachname, Quelle (Vorschläge + freie Eingabe)
- Häkchen "Auto-Kampagne auslösen" (vorausgewählt, wenn Automatik an) → Status "geplant" statt "neu"

**4. Schnittstelle für externe Systeme**
- POST `/api/public/leads-ingest` mit `{email, first_name, last_name, source}` → 201, Lead wird geplant (jetzt + Verzögerung)
- Abweichung: verlangt einen geheimen Schlüssel im Header `x-ingest-key`. Ohne Schutz könnte jeder Fremde beliebige Adressen eintragen und über eure SMTP-Konten Mails auslösen (Spam, Sperrung der Konten). Schlüssel wird generiert und in den Projekt-Secrets abgelegt.

**5. Automatischer Versand**
- Abweichung: keine Edge-Function/pg_cron (Port 587 blockiert, nodemailer läuft dort nicht; bisher bewährt: worker-mailer im App-Server). Stattdessen wird der bestehende minütliche Takt (`/api/public/campaign-tick`) erweitert: er versendet zusätzlich fällige Leads. Ein externer Planer (cron-job.org) bleibt nötig; solange die Leads-Seite offen ist, treibt sie den Versand selbst an.
- Pro Lead: zufälliges aktives Konto mit freiem Tageslimit, HTML aus der gewählten Vorlage, Platzhalter {klick_domain}, {first_name}, {last_name}, {anrede}
- Anrede: eingebettete Liste häufiger deutscher Vornamen → "Sehr geehrter Herr X" / "Sehr geehrte Frau X", sonst "Sehr geehrte Damen und Herren"
- Mindest-Abstand wird über einen Zeitstempel "letzter Auto-Versand" in den Einstellungen eingehalten
- Status → gesendet/fehlgeschlagen inkl. Konto und Fehlertext, Eintrag ins Mail-Log

## Technische Details
- Migration: `leads_settings.last_auto_sent_at timestamptz`, `template_key` speichert die Kampagnen-ID (Text); Index `leads(status, scheduled_at)`.
- Neu: `src/lib/anrede.ts` (Namenslisten + `buildAnrede`), `src/lib/leads-sender.server.ts` (`runLeadsTick`, teilt Lock + Mailer-Cache mit Kampagnen-Sender), `src/lib/leads.functions.ts` (createLead, saveSettings, sendDueLeadsNow – Admin-geprüft), `src/routes/api/public/leads-ingest.ts` (Zod, konstante Zeit-Prüfung des Schlüssels, supabaseAdmin erst nach Prüfung).
- campaign-tick ruft nach dem Kampagnen-Schritt `runLeadsTick` auf.
- UI: `admin.leads.tsx` neu, Komponenten in `src/components/admin/leads/`; Automatisierungs-Seite verweist auf /admin/leads.
- Tests: `buildAnrede` (Herr/Frau/Fallback) und Ingest-Validierung.
