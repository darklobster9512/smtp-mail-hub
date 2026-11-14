# Dropdowns lesbar machen

## Problem
Die Auswahlfelder „Typ“ und „Status“ im Fenster „Konto hinzufügen/bearbeiten“ sind normale Browser-Dropdowns ohne eigene Hintergrundfarbe. Die aufgeklappte Liste zeigt deshalb weiße Schrift auf weißem Grund.

## Änderung
- Beide Dropdowns bekommen den dunklen Hintergrund und die helle Schrift der App, auch für die einzelnen Einträge.
- Zusätzlich wird der ganzen Seite gesagt, dass sie dunkel ist. Dann zeichnet der Browser auch Bildlaufleisten und künftige Dropdowns dunkel.
- Andere Dropdowns der App sind bereits fertige Bausteine und nicht betroffen. Geprüft: Es gibt nur diese zwei einfachen Dropdowns.

## Technische Details
- `AccountDialog.tsx`: `bg-transparent` → `bg-background text-foreground` an beiden `<select>`; `[&>option]:bg-background [&>option]:text-foreground`.
- `src/styles.css`: `color-scheme: dark` auf `:root`.
- Prüfung: Screenshot des geöffneten Fensters.
