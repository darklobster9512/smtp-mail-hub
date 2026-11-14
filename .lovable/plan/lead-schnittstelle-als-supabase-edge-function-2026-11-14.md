# Lead-Schnittstelle als Supabase Edge Function

Das Projekt ist mit Supabase verbunden. Beim letzten Mal wurde nur das Anlegen der Edge Function blockiert, deshalb bin ich auf einen App-Link ausgewichen. Jetzt versuche ich es noch einmal direkt als Supabase-Funktion.

## Was gebaut wird
- Edge Function `leads-ingest`: öffentlich, ohne Key, mit CORS, max. 100 Leads pro Aufruf, Doppelte werden erkannt.
- Sie speichert die Leads über die vorhandene Funktion `ingest_leads` und plant den Versand mit der eingestellten Verzögerung ein.
- Danach stößt sie den Versand in der App an. Der Versand selbst muss in der App bleiben, weil Supabase-Funktionen die Mail-Ports 465/587 nicht öffnen dürfen.
- Auf der Seite Automatisierung steht dann der Supabase-Link `https://<projekt>.supabase.co/functions/v1/leads-ingest` mit JSON-Beispiel und curl-Befehl.
- Der App-Link bleibt als Ersatz bestehen.

## Falls Supabase es wieder blockiert
Dann sage ich dir genau, was blockiert wurde. Der App-Link bleibt dann aktiv und funktioniert genauso.

## Technisch
- `supabase/functions/leads-ingest/index.ts` (Deno, service role aus env), `verify_jwt = false` in config.toml, Deploy über die Supabase-Tools.
- Die Funktion ruft per fetch `{app_base_url}/api/public/leads-send` auf.
- `admin.automation.tsx` zeigt die Supabase-URL als Hauptlink.
