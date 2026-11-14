# Landingpage im Higgsfield-Stil

Die Postwerk-Seite bekommt den Look von higgsfield.ai: tiefschwarz, neongelbe Buttons, pink glühende Überschrift, große Bildkacheln. Die Texte bleiben gleich, Aufbau und Optik ändern sich.

## Neuer Aufbau
1. **Kopfzeile**: Schwarz, viele kleine Menüpunkte mit Etiketten wie „Neu“ oder „Top“, rechts „Login“ (umrandet) und „Registrieren“ (neongelb)
2. **Aufmacher**: Riesige, fett gesetzte Überschrift in Großbuchstaben mit pinkem Neon-Leuchten über einem Kachel-Raster. Darunter vier dunkle Zähler-Kästen (z. B. 99,99 % / <1 s / EU / 24/7) und ein neongelber Button
3. **Bildkacheln** (4 nebeneinander, seitlich scrollbar): große Bilder mit fetter Schrift darauf (z. B. „SMTP IN 5 MINUTEN“, „ZUSTELLUNG 99,99 %“), darunter Titel in Großbuchstaben und eine Zeile Text. Die Bilder erstelle ich neu.
4. **Funktions-Raster**: links eine große pinke Aktionskachel („3.000 MAILS GRATIS“ + gelber Button), rechts 6 kompakte dunkle Karten mit Symbol, Name und kleinem farbigem Etikett (NEU, 4K-artig z. B. „DKIM“, „BALD“)
5. **So funktioniert's**: das SMTP-Code-Fenster im dunklen Kartenstil
6. **Preise**: dunkle Karten, beliebtes Paket mit gelbem Rand und Etikett „-60 %“-Stil („Beliebt“)
7. **FAQ** und **Fußzeile** im gleichen dunklen Stil

## Gestaltung
- Farben: fast schwarzer Hintergrund, Neongelb-Grün (Buttons/Akzente), Magenta-Pink (Leucht-Effekte, Aktionskacheln)
- Schrift: kräftige, enge Groteske (z. B. „Archivo Black“ für Überschriften, „Inter Tight“ für Text)
- Kleine farbige Etiketten, abgerundete Kacheln, Leucht-Schatten

## Technische Details
- Tokens in `src/styles.css` neu setzen (primary = Neongelb, neue Tokens `--neon-pink`, `--tile`, Glow-Utilities, Kachel-Raster-Hintergrund).
- Fonts im `__root.tsx`-Head austauschen.
- `src/components/landing/sections.tsx` umbauen; 4 Kachelbilder per Bildgenerierung nach `src/assets/`.
