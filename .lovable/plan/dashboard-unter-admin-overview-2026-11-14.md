# Dashboard unter /admin/overview

## Was gebaut wird

**1. Fünf Kennzahl-Karten oben**
- SMTP-Konten: aktiv / gesamt. Beim Darüberfahren zeigt ein Hinweis die Zahl der gesperrten Konten
- Kampagnen: fertig / gestartet (gestartet = alles außer Entwurf)
- Leads gesamt
- Mails heute gesendet: Summe der heutigen Zähler aller aktiven Konten (Zähler von gestern zählen als 0)
- Erfolgsquote der letzten Kampagne: gesendet / (gesendet + fehlgeschlagen) in %, mit Name der Kampagne

**2. Zwei Diagramme**
- Balken: Mails pro Tag der letzten 14 Tage (Berliner Zeit, Tage ohne Mails = 0). Zählt Kampagnen-Mails und automatische Lead-Mails
- Ring: Verteilung der Leads nach Status (neu / geplant / gesendet / fehlgeschlagen)
- Farben bleiben schlicht: Neongelb als Hauptfarbe, sonst Grautöne; nur „fehlgeschlagen“ in Rot

**3. Aktivitäten unten**
- Die letzten 10 Log-Einträge: Zeit, Typ-Abzeichen (info = blau, warning = gelb-orange, error = rot), Nachricht

**4. Daten vom Server**
- Statt einer Edge Function (wie bisher) eine Server-Funktion „dashboard-stats“. Sie prüft zuerst, ob der Aufrufer Admin ist, und berechnet dann alle Zahlen mit Vollzugriff
- Die Seite aktualisiert sich alle 30 Sekunden

## Technische Details
- `src/lib/dashboard.functions.ts`: `getDashboardStats` (requireSupabaseAuth + has_role-Prüfung, danach supabaseAdmin per dynamischem Import). Liest `sent_at` der letzten 14 Tage aus `campaign_recipients` und `leads` (status sent) und gruppiert in JS nach Datum (`sv-SE`, Europe/Berlin); Status-Zählungen über head-count-Abfragen. Gibt ein reines Datenobjekt zurück.
- `admin.overview.tsx` neu: Abfrage-Optionen + Loader `ensureQueryData` + `useSuspenseQuery`; recharts über shadcn `ChartContainer` (Bar + Pie mit innerRadius); Tooltip für die Konten-Karte.
- `StatusBadge`-Farben für Logs: info → chart-2 (blau), warning → chart-4, error → destructive (nur auf dieser Seite, eigenes Abzeichen).
- Ein Test für die Tagesgruppierung (14 Einträge, Lücken = 0) und die Erfolgsquote (0 Mails → „–“).
