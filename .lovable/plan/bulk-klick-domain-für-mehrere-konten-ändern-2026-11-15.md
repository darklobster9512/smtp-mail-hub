# Bulk: Klick-Domain für mehrere Konten ändern

## Was du bekommst
- Neuer Button **„Klick-Domains verteilen“** oben auf /admin/accounts (neben „Bulk-Test“).
- Popup:
  1. Kontenliste mit Häkchen + „Alle auswählen“ (zeigt Label und aktuelle Klick-Domain).
  2. Großes Textfeld: **jede Zeile = 1 Link**. Leere Zeilen und doppelte Einträge werden ignoriert, ungültige Zeilen werden markiert.
  3. Vorschau: wie viele Konten pro Link bekommen.
  4. Button „Übernehmen“ – speichert und aktualisiert die Tabelle.

## Verteilung
- Gleichmäßig und zufällig: Konten werden gemischt und reihum den Links zugeteilt. Beispiel: 10 Konten, 3 Links → 4 / 3 / 3. Welcher Link die „Extra“-Konten bekommt, ist ebenfalls zufällig.

## Technische Details
- Neue Datei `src/components/admin/accounts/BulkKlickDomainDialog.tsx`, eingebunden in `admin.accounts.tsx`.
- Reine Funktion `distributeLinks(accountIds, links, rng)` in `src/lib/klick-distribute.ts` mit Test (gleichmäßig: Differenz max. 1, jedes Konto genau einmal).
- Speichern per Supabase-Update je Link-Gruppe (`update ... in ids`), Admin-RLS greift bereits.
- Links werden getrimmt; `https://` wird nicht erzwungen, Zeilen mit Leerzeichen gelten als ungültig.
