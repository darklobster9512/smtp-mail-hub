# Landingpage schlichter, nur Neongelb

Gleiche Inhalte, aber deutlich ruhiger: schwarzer Hintergrund, weiße Schrift, Neongelb-Grün als einzige Akzentfarbe. Kein Pink, kein Leuchten.

## Änderungen
- **Pink komplett entfernen**: Leucht-Überschrift, pinkes Raster, pinke Aktionskacheln, pinke Etiketten und Schatten
- **Aufmacher**: große, klare weiße Überschrift (kein Glow), ein Wort in Neongelb, kurzer Untertitel, ein gelber Button. Kennzahlen als schlichte Textzeile statt Leuchtkästen
- **Bildkacheln raus**: die vier Bilder mit Schrift darauf entfallen (Bilddateien werden gelöscht)
- **Funktionen**: einfaches Raster mit 6 ruhigen Karten, ohne bunte Etiketten und ohne Aktionskachel
- **Kopfzeile**: nur wenige Menüpunkte (Funktionen, Preise, FAQ), Login + gelber „Registrieren“-Button, ohne Etiketten
- **Ablauf, Preise, FAQ**: bleiben, nur Gelb als Akzent; Abschluss-Block ohne Glow
- Überschriften normal geschrieben statt durchgehend in Großbuchstaben; Schrift Inter Tight beibehalten, die fette Plakatschrift entfällt

## Technische Details
- `src/styles.css`: `--neon-pink`, `--neon-blue`, `--shadow-pink`, `text-neon`, `bg-promo`, `bg-tiles` entfernen; `--accent` auf neutrales Dunkelgrau.
- `__root.tsx`: Archivo Black aus dem Font-Link entfernen.
- `sections.tsx` vereinfachen, `Tag`-Komponente und Kachelbilder entfernen; `src/assets/tile-*.jpg` löschen.
