# Landingpage für einen SMTP-Dienst

Eine deutschsprachige Landingpage auf der Startseite für einen SMTP-/E-Mail-Versanddienst für Entwickler und Firmen.

## Abschnitte
1. **Kopfzeile**: Logo, Links (Funktionen, Preise, Doku, FAQ) und ein Button „Kostenlos starten“
2. **Aufmacher**: Große Überschrift (z. B. „Zuverlässiger E-Mail-Versand per SMTP“), kurzer Text, zwei Buttons und ein Code-Fenster mit SMTP-Zugangsdaten bzw. einem Versandbeispiel
3. **Kennzahlen**: z. B. 99,99 % Zustellbarkeit, < 1 s Versandzeit, DSGVO / Server in der EU
4. **Funktionen**: 6 Karten – SMTP-Relay & API, SPF/DKIM/DMARC, Echtzeit-Statistiken, Webhooks, Bounce-Verwaltung, dedizierte IPs
5. **So funktioniert's**: 3 Schritte – Domain verifizieren, Zugangsdaten eintragen, senden
6. **Preise**: 3 Pakete (Free, Pro, Business) mit Monatskontingent
7. **FAQ**: aufklappbare Fragen
8. **Abschluss-Aufruf + Fußzeile**

## Gestaltung
Technisch und modern: dunkles Anthrazit mit kräftigem Signal-Grün als Akzentfarbe, Schriften Space Grotesk + JetBrains Mono (für Code), Raster-Hintergrund und dezente Effekte. Funktioniert auf Handy und Desktop.

## Hinweise
- Name, Preise und Kennzahlen sind Platzhalter (Arbeitsname „Postwerk“) – du kannst mir die echten Angaben nennen.
- Buttons führen vorerst nur zu Abschnitten auf der Seite; Registrierung oder echter Versand sind nicht Teil dieses Schritts.

## Technische Details
- `src/routes/index.tsx` neu schreiben (Platzhalter entfernen), eigener `head()` mit deutschem Titel/Beschreibung/OG-Tags; `__root.tsx`-Metadaten anpassen, `lang="de"`, Google Fonts per `<link>`.
- Farb-/Schrift-Tokens in `src/styles.css` (oklch), nur semantische Klassen.
- Abschnitte als Komponenten unter `src/components/landing/`; FAQ mit Accordion.
- Kurzer Eintrag in `AGENTS.md` zur Struktur.
