# Bulk-Test für E-Mail-Konten

## Was du bekommst
- Neuer Button **„Bulk-Test“** oben auf /admin/accounts.
- Fenster mit Liste aller Konten (Label, Typ, Absender), je mit Häkchen, plus **„Alle auswählen“** / „Keine“.
- Feld für die Empfänger-Adresse (wird geprüft), Button **„Testmails senden“**.
- Die Konten senden nacheinander (ca. 1 pro Sekunde, damit nichts blockiert wird). Pro Zeile siehst du live: wartet / sendet / ✓ gesendet (grün) / ✗ Fehler (rot) mit der genauen Fehlermeldung darunter.
- Zusammenfassung am Ende: „X erfolgreich, Y fehlerhaft“.
- Button **„Fehlerhafte entfernen (Y)“** mit Sicherheitsabfrage, löscht genau die Konten mit Fehler und aktualisiert die Tabelle.
- Abbrechen-Button während des Laufs.

## Technisch
- Neue Komponente `src/components/admin/accounts/BulkTestDialog.tsx`.
- Nutzt den bestehenden Server-Aufruf `sendTestMail` (gleiche Business-Testmail, Proxy- und Resend-Logik) einzeln pro Konto, damit jede Antwort sofort angezeigt wird und kein Aufruf zu lang läuft.
- Löschen über die bestehende Lösch-Logik der Konten (admin-only per RLS).
- Einbindung in `admin.accounts.tsx` neben „Bulk-Import“.
