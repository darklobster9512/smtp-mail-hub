# Domain shopmanagement.lol eintragen

## Was sich ändert
- **Lead-Schnittstelle (Automatisierung):** Der angezeigte Link, die JSON-/curl-Beispiele und die Kopier-Buttons nutzen fest `https://shopmanagement.lol` statt der aktuellen Lovable-Adresse.
  Beispiel: `https://shopmanagement.lol/api/public/leads-ingest`
- **„Schnittstelle testen“ und Selbst-Auslösung des Versands:** Die gespeicherte App-Adresse in den Einstellungen wird auf `https://shopmanagement.lol` gesetzt, damit auch der Hintergrund-Versand diese Domain nutzt.
- **Vite-Konfiguration:** `shopmanagement.lol` und `www.shopmanagement.lol` werden als erlaubte Hosts eingetragen.

## Hinweis
Der Link funktioniert erst, wenn die Domain mit dem Projekt verbunden und die App veröffentlicht ist. Bis dahin schlagen Tests über den Button fehl.

## Technisch
- `admin.automation.tsx`: `BASE` = Konstante `PUBLIC_BASE_URL = "https://shopmanagement.lol"` (in `src/lib/site.ts`).
- Daten-Update `admin_settings.app_base_url` auf die neue Domain.
- `vite.config.ts`: `vite: { plugins: [...], server: { allowedHosts: ["shopmanagement.lol", "www.shopmanagement.lol"] }, preview: { allowedHosts: [...] } }`.
