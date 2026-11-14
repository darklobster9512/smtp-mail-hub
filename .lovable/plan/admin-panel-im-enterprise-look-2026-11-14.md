# Admin-Panel im Enterprise-Look

Die Farbrichtung bleibt wie festgelegt: Schwarz mit Neongelb-Grün als einzigem Akzent, schlicht, ohne Glow. Der „Enterprise“-Eindruck kommt aus Ordnung, Dichte und Details.

## Was sich ändert
1. **Seitenleiste:** Gruppen mit Überschriften (Betrieb: Übersicht, Kampagnen, Leads; Versand: E-Mail-Konten, Proxys, Automatisierung). Logo-Feld mit Name und Zusatz „Admin Console“. Unten Konto-Bereich mit Initialen-Avatar, E-Mail und Logout. Aktiver Punkt mit schmalem Akzent-Streifen links statt großer Fläche.
2. **Kopfzeile:** Brotkrumen (z. B. „Versand / E-Mail-Konten“), rechts Statuspunkt „System aktiv“ und Avatar-Menü mit Logout statt des einzelnen Logout-Knopfs.
3. **Seitenüberschriften:** Einheitlich mit Titel, kurzer Beschreibung und Aktionsknöpfen rechts, feine Trennlinie darunter. Die Inhaltsbreite wird begrenzt, damit es auf großen Bildschirmen nicht ausfranst.
4. **Übersicht:** Kennzahlen-Karten mit Symbol, kleiner Beschriftung in Großbuchstaben, großer Zahl und Nebenzeile. Die Diagramm-Karten bekommen Titel mit Untertitel. Der Aktivitäten-Feed wird eine saubere Tabelle mit Typ-Punkt statt breitem Badge.
5. **Tabellen überall:** Kompakte Zeilen, Kopfzeile in kleinen Großbuchstaben mit hellem Grau, sanftes Hervorheben der Zeile beim Darüberfahren, Zahlen in Tabellenziffern, Aktions-Knöpfe erst beim Darüberfahren deutlich. Status-Badges bekommen einen kleinen Punkt. Leere Tabellen zeigen Symbol und Hinweistext.
6. **Karten und Formulare:** Feinere Rahmen, einheitlicher Abstand, Eingabefelder mit klarem Fokusring in der Akzentfarbe.
7. **Feinschliff:** Dezenter Seitenhintergrund (Inhalt auf etwas hellerer Karte vom Rand abgesetzt), Lade-Platzhalter statt leerer Fläche in der Übersicht.

## Nicht geändert
Funktionen, Daten, Texte der Abläufe und die Landingpage bleiben unverändert. Es wird nur das Aussehen angepasst.

## Technische Details
- `src/styles.css`: neue Tokens (Tabellen-Kopf, Zeilen-Hover, Seitenleisten-Linie), `tabular-nums`-Hilfsklasse. Keine festen Farben in Komponenten.
- `AdminSidebar.tsx` (Gruppen, Footer mit Nutzer), `admin.tsx` (Kopfzeile, Brotkrumen über `useRouterState`, Dropdown-Menü, `max-w`-Container).
- `components/admin/ui.tsx`: `PageHeader` (Aktions-Slot), `DataTable`, `StatusBadge`, neue `StatCard` und `EmptyState`.
- `admin.overview.tsx` auf `StatCard`/Skeleton umstellen. Die übrigen Seiten übernehmen den Stil automatisch über die gemeinsamen Bausteine; `admin.accounts.tsx` und andere nutzen weiter `PageHeader`/`DataTable`.
- Prüfung: Screenshots der Seiten auf Desktop und Handy-Breite, soweit ohne Admin-Login möglich; sonst unter Vorbehalt gemeldet.
