# Leads löschen auf /admin/leads

## Was du bekommst
- In jeder Zeile der Leads-Tabelle ein Löschen-Symbol (Papierkorb), auch bei gesendeten, fehlgeschlagenen oder geplanten Leads.
- Checkboxen pro Zeile plus "Alle auf dieser Seite auswählen" und ein Button "Ausgewählte löschen (n)".
- Vor dem Löschen eine Bestätigung ("X Leads endgültig löschen?").
- Nach dem Löschen Hinweis-Meldung und die Liste aktualisiert sich sofort.

## Technische Details
- Löschen direkt über den Browser-Datenbankzugang (`supabase.from("leads").delete().in("id", ids)`); die bestehende Admin-Regel erlaubt das bereits, kein Statusfilter.
- Bestätigung mit dem vorhandenen AlertDialog, Toasts über die vorhandenen Helfer.
- Auswahl wird beim Seitenwechsel zurückgesetzt.
