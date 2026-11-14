# Kampagnen-Verwaltung (/admin/campaigns)

## Funktionen
1. **Übersicht**
   - Spalten: Name, Betreff, Status, gesendet X/Y und Fehler.
   - Status-Farben: draft = grau, sending = blau, aborted = orange, done = grün, failed = rot.
   - Aktionen: Bearbeiten, Duplizieren, Starten (nur bei draft) und Löschen.
   - Ein Klick auf den Namen öffnet die Detailansicht.
2. **Neue Kampagne / Bearbeiten** als eigene Seite, weil das HTML-Feld viel Platz braucht.
   - Felder: Name, Betreff und ein großes HTML-Feld.
   - Eine Hinweisbox erklärt die Platzhalter {klick_domain}, {first_name}, {last_name} und {anrede}.
   - **Vorschau** öffnet ein Fenster mit dem gerenderten HTML; die Platzhalter sind dort durch Beispielwerte ersetzt.
   - Zwei Buttons: „Als Entwurf speichern“ und „Speichern & Senden starten“.
3. **Senden-starten-Fenster**
   - Empfänger einfügen, eine Zeile pro Adresse, Format `email;Vorname;Nachname;Anrede` (alles nach der E-Mail ist optional).
   - Ungültige Zeilen und Dubletten werden gezählt und als Warnung aufgelistet; gesendet wird nur an gültige Adressen.
   - SMTP-Konten als Checkboxen, nur aktive. Jedes Konto zeigt „heute gesendet / Limit“.
   - Danach eine Bestätigung („X Empfänger über Y Konten senden?“) und der Start.
4. **Versand im Hintergrund**
   - Höchstens 1 Mail pro Sekunde, insgesamt über alle Kampagnen.
   - Die Konten wechseln sich der Reihe nach ab. Ein Konto, das sein Tageslimit erreicht hat, wird übersprungen; um Mitternacht zählt es wieder von vorn.
   - Pro Mail werden die Platzhalter ersetzt: Klick-Domain aus dem Konto, Name und Anrede aus der Empfängerzeile, sonst leer.
   - Jeder Empfänger bekommt den Status sent oder failed, dazu Fehlertext, Zeitpunkt und das verwendete Konto.
   - Am Ende steht die Kampagne auf done, oder auf failed, wenn alle Mails fehlgeschlagen sind. Sind alle Konten am Limit, wartet der Versand bis zum nächsten Tag.
   - Zusätzlich gibt es einen Button „Abbrechen“; die Kampagne steht dann auf aborted.
5. **Detailansicht (/admin/campaigns/:id)**
   - Kopf mit gesendet / fehlgeschlagen / ausstehend / gesamt und einem Fortschrittsbalken, der sich alle paar Sekunden aktualisiert.
   - Darunter die Empfängertabelle mit Status, Fehler und Konto, mit Seitenumschaltung und Statusfilter.
   - „Fehlgeschlagene neu versenden“ setzt diese Empfänger zurück auf ausstehend und startet den Versand wieder.

## Wie der Hintergrund-Versand funktioniert
Ein einzelner Serveraufruf darf nur kurz laufen. Darum wird in Schritten versendet: Jeder Schritt verschickt etwa 45 Mails in rund 50 Sekunden und endet dann.
- **Veröffentlichte App**: Das Backend löst jede Minute automatisch einen Schritt aus. Der Versand läuft weiter, auch wenn du den Browser schließt.
- **Vorschau / solange die Detailseite offen ist**: Die Seite stößt die Schritte selbst an. Eine Sperre stellt sicher, dass nie zwei Schritte gleichzeitig laufen, damit das Limit von 1 Mail pro Sekunde hält.

## Abweichung von deiner Vorgabe
Statt einer Supabase-Edge-Function mit nodemailer läuft der Versand über die Server-Funktionen der App. Das hat denselben Grund wie bei der Testmail: Edge-Functions blockieren Port 587. Starten können nur Admins.

## Hinweis
Für Massenversand an eingefügte Listen brauchst du die Einwilligung der Empfänger (DSGVO/UWG) und eine Abmeldemöglichkeit in der Vorlage. Ich ergänze in der Hinweisbox einen Platzhalter-Vorschlag dafür.

## Technische Details
- **Migration**
  - `campaign_recipients`: neue Spalten first_name, last_name, anrede.
  - `campaigns`: neue Spalten smtp_account_ids uuid[], rr_index int, last_error.
  - Indizes auf (campaign_id, status).
  - Funktion `claim_sender_lock(ttl)` / `release_sender_lock()`: globale Sperre über eine Zeile in admin_settings, nur für service_role ausführbar.
  - pg_cron + pg_net: Job jede Minute, der die öffentliche Tick-Route aufruft. Er wird erst nach dem Veröffentlichen mit der echten URL eingerichtet.
- **`src/lib/campaigns.functions.ts`** (requireSupabaseAuth + has_role admin)
  - `startCampaign`: validiert, legt die Empfänger in Blöcken an, setzt Status sending und Zähler und stößt einen Tick an.
  - `retryFailed`
  - `abortCampaign`
  - `runTick`: Admin-Variante für die offene Detailseite.
- **`src/lib/campaign-sender.server.ts`**: Tick-Logik.
  - Sperre holen.
  - Ausstehende Empfänger aller sending-Kampagnen der Reihe nach abarbeiten, bis etwa 50 s vergangen sind.
  - Konto-Rotation mit Tageslimit-Reset (sent_date ≠ heute → sent_today = 0).
  - worker-mailer-Verbindung pro Konto wiederverwenden.
  - Pausen von 1 s zwischen Mails.
  - Zähler aktualisieren, Abschluss setzen, mail_logs schreiben, Sperre freigeben.
- **`src/routes/api/public/campaign-tick.ts`**: POST, prüft den Header `x-cron-secret` gegen das Secret `CRON_SECRET` und ruft dann den Tick auf.
- **Routen**: `admin.campaigns.tsx` wird zum Layout mit `<Outlet/>`, dazu `admin.campaigns.index.tsx` (Liste), `admin.campaigns.new.tsx`, `admin.campaigns.$id.tsx` (Detail) und `admin.campaigns.$id_.edit.tsx`.
- **Komponenten** unter `src/components/admin/campaigns/`: Editor, Vorschau-Dialog (iframe `srcdoc` mit `sandbox`), Senden-Dialog sowie ein Parser für die Empfängerzeilen inklusive kleinem Test.
