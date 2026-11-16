# Seitentitel, Beschreibungen, Favicon, Lovable-Hinweise entfernen

## Was du sehen wirst
- **Jede Seite bekommt einen eigenen, passenden Titel** im Browser-Tab, z. B. „Kampagnen – Postwerk Admin", „E-Mail-Konten – Postwerk Admin", „Automatisierung – Postwerk Admin". Die Startseite und der Login behalten ihre Titel, aber mit verbesserter Beschreibung.
- **Jede Seite bekommt eine kurze Beschreibung** (für Linkvorschauen und Suchmaschinen). Der Admin-Bereich bleibt für Suchmaschinen gesperrt.
- **Neues Favicon:** ein schlichtes Postwerk-Zeichen (stilisierter Umschlag/„P") in Neongelb-Grün auf Schwarz – passend zu deinem Design. Das alte Lovable-Icon wird gelöscht.
- **Lovable-Hinweise weg:** Der Text „Schlüssel anlegen: in Lovable Projektname → Settings → Secrets" auf der Automatisierungs-Seite wird neutral formuliert. Die angezeigte Schnittstellen-Adresse bleibt vorerst die aktuelle App-Adresse (die enthält „lovable.app") – sie ändert sich erst mit einer eigenen Domain; ich lese sie künftig automatisch aus der aktuellen Adresse, damit nach einer Domain-Umstellung sofort die richtige erscheint.
- **Lovable-Badge** („Edit with Lovable") auf der veröffentlichten Seite: lässt sich nur über die Projekteinstellungen ausblenden (Bezahl-Plan nötig) – ich kann es dir dort zum Bestätigen anbieten.

## Technische Details
- head() mit title/description/og:title/og:description/og:type für alle Admin-Routen (overview, accounts, campaigns index/new/detail/edit, leads, proxies, automation, logs usw.); robots noindex bleibt im Admin-Layout.
- Favicon per generate_image (premium), auf 64x64 nach public/favicon.png, Link in __root.tsx, public/favicon.ico löschen. Root-Platzhalter-Kommentar entfernen.
- Interne Technik-Dateien (Fehlermeldung an Editor, Vorschau-Login) bleiben unverändert – sie sind für Besucher unsichtbar und nötig für die Vorschau.
