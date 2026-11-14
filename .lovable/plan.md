# Verifikation des Admin-Panels – Ergebnis und nötige Fixes

## Prüfergebnis (nur gelesen, nichts geändert)

**1. Auth & Routing**
- ✓ /login mit Supabase-Anmeldung (`src/routes/login.tsx`)
- ✓ Registrierung nur, solange kein Admin existiert: Abfrage `admin_exists()` beim Laden der Login-Seite (login.tsx Z. 37). Zusätzlich wird nur der erste Nutzer Admin (DB-Trigger `handle_new_user_role`), spätere Nutzer bekommen keinen Datenzugriff
- ✓ /admin geschützt: `_authenticated/route.tsx` leitet ohne Sitzung zu /login um
- ✓ Alle 5 Unterseiten vorhanden und in der Seitenleiste (`AdminSidebar.tsx`)

**2. Datenbank**
- ✓ Alle 7 Tabellen vorhanden, Spalten laut Spezifikation plus Ergänzungen (Empfänger: Vorname/Nachname/Anrede; Kampagnen: Konten-Auswahl, Rotation, letzter Fehler; Lead-Einstellungen: letzter Auto-Versand)
- ✓ RLS überall aktiv. Abweichung (gewollt): nicht „jeder Angemeldete“, sondern nur der Admin hat Zugriff (`has_role`). SMTP-Passwörter sind für den Browser nicht lesbar

**3. SMTP-Konten**
- ✓ Anlegen/Anzeigen/Bearbeiten/Löschen, alle 9 Felder vorhanden
- ⚠️ Testmail funktioniert, aber als Server-Funktion mit worker-mailer statt Edge Function mit nodemailer (Edge Functions sperren Port 587, nodemailer läuft dort nicht). Port 465 = TLS, sonst STARTTLS; Empfänger wird geprüft (`smtp.functions.ts`, `TestMailDialog.tsx`)

**4. Kampagnen**
- ✓ Editor mit den 4 Platzhaltern, Vorschau im iframe (`PreviewDialog.tsx`)
- ✓ Senden: Empfänger einfügen mit Prüfung, Konten-Auswahl, Bestätigung
- ⚠️ Versand läuft schrittweise (`campaign-sender.server.ts`): 1 Mail/Sek., Rotation, Tageslimit, Status je Empfänger. Im Hintergrund aber nur mit externem Minuten-Takt, sonst nur bei geöffneter Detailseite
- ✓ Duplizieren und Fehlgeschlagene neu senden

**5. Leads & Automatisierung**
- ✓ Formular, Liste, Status-Abzeichen, Zeitraum-Filter, Einstellungen mit Vorlagen-Auswahl
- ✗ Externe Lead-Schnittstelle nimmt aktuell nichts an: sie verlangt (gewollt) einen Schlüssel, der Schlüssel `LEADS_INGEST_KEY` ist aber noch nicht hinterlegt → jede Anfrage wird abgelehnt
- ⚠️ Ist die Automatik ausgeschaltet, landen Leads aus der Schnittstelle als „neu“ statt „geplant“ (Spezifikation: immer geplant)
- ⚠️ Auto-Versand: kein pg_cron; läuft bei geöffneter Leads-Seite, über den Button und über den Minuten-Takt. Der Takt ist noch nicht eingerichtet (App nicht veröffentlicht)
- ✓ Anrede aus Namensliste mit Rückfall (`anrede.ts`, getestet)

**6. Dashboard** – ✓ Karten, beide Diagramme, Aktivitäten-Feed
**7. Bulk-Import** – ✓ beide Formate, Duplikat-Schutz, gemeinsame Felder (getestet)
**8. Realtime & UX** – ✓ Live-Abo auf Leads, Tabellen seitlich scrollbar, mobile Seitenleiste, Fehlerseite, verständliche Meldungen
**9. Edge Functions** – keine angelegt (bewusst). Stattdessen:

| Name | Zweck | Schutz |
|---|---|---|
| sendTestMail | Testmail | angemeldet + Admin |
| startCampaign / retryFailed / abortCampaign / runCampaignTick | Kampagnen | angemeldet + Admin |
| createLead / sendDueLeadsNow / runLeadsTickFn | Leads | angemeldet + Admin |
| getDashboardStats | Dashboard | angemeldet + Admin |
| /api/public/campaign-tick | Minuten-Takt (Kampagnen + Leads) | Schlüssel `CRON_SECRET` ✓ |
| /api/public/leads-ingest | Leads von außen | Schlüssel `LEADS_INGEST_KEY` ✗ fehlt |

**Gesamt:** 20 ✓ · 4 ⚠️ · 1 ✗. Nichts davon wurde bisher angemeldet live getestet.

**Kritischste Lücken**
1. Schlüssel für die Lead-Schnittstelle fehlt → externe Leads kommen nicht an
2. Hintergrund-Versand braucht Veröffentlichung + externen Minuten-Takt
3. E-Mail/Passwort-Anmeldung muss im Supabase-Dashboard aktiv sein (nicht von hier prüfbar)

## Fixes vor dem ersten Live-Test
1. Schlüssel `LEADS_INGEST_KEY` über ein sicheres Eingabefeld anlegen lassen (du wählst/erzeugst ihn und gibst denselben Wert deinem externen System)
2. Lead-Schnittstelle: Leads immer als „geplant“ anlegen (laut Spezifikation); Versand passiert trotzdem nur, wenn die Automatik an ist. Der Auto-Versand überspringt dafür geplante Leads, solange die Automatik aus ist
3. Ein kleiner Test für die Schnittstellen-Regel (ohne Schlüssel 401, gültige Daten → geplant + Zeitpunkt = jetzt + Verzögerung)
4. Danach du: veröffentlichen, Minuten-Takt bei cron-job.org einrichten, E-Mail-Anmeldung in Supabase prüfen
