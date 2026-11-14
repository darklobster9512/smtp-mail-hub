# Admin-Panel für E-Mail-Kampagnen

Ein geschützter Admin-Bereich mit Login, Sidebar und den gewünschten Datentabellen in deinem verbundenen Backend. Gleicher Look wie die Landingpage: Schwarz mit Neongelb-Grün, schlicht.

## Seiten
- **/login**: zentriertes Formular für E-Mail und Passwort. Der Tab „Registrieren“ erscheint nur, solange noch kein Admin existiert. Danach ist nur noch der Login möglich.
- **/admin**: leitet weiter auf /admin/overview. Nicht eingeloggte Besucher landen auf /login.
- **Sidebar** mit dem Bereich „Dashboards“: Übersicht, E-Mail-Konten, Kampagnen, Leads, Automatisierung. Die Sidebar lässt sich einklappen.
- **Kopfzeile** mit Logout-Button oben rechts.
- **Unterseiten**: In diesem Schritt bekommen sie eine Überschrift und eine einfache Liste bzw. Kennzahlen aus der jeweiligen Tabelle. Formulare zum Anlegen und Bearbeiten sowie der eigentliche Versand kommen in späteren Schritten.
  - Übersicht: Anzahl der Konten, Kampagnen und Leads sowie die letzten Logeinträge.
  - E-Mail-Konten: Liste der SMTP-Konten.
  - Kampagnen: Liste der Kampagnen mit Status und Gesendet/Fehler.
  - Leads: Liste der Leads.
  - Automatisierung: zeigt die Leads-Einstellungen an.

## Datenbank
Die Tabellen entstehen genau wie beschrieben: admin_settings, smtp_accounts, campaigns, campaign_recipients, leads, leads_settings (genau eine Zeile mit id=1, vorbelegt) und mail_logs. Zeilenschutz ist bei allen aktiviert.

## Zwei Abweichungen zur Sicherheit
1. **Nur der Admin hat Zugriff, nicht jeder eingeloggte Nutzer.** Die Registrierung im Backend lässt sich über die Schnittstelle trotzdem aufrufen. Mit „alle eingeloggten Nutzer“ könnte sich also jemand selbst ein Konto anlegen und alle Daten samt SMTP-Passwörtern lesen. Deshalb bekommt der erste registrierte Nutzer automatisch die Admin-Rolle, und alle Tabellen sind nur für Admins lesbar und schreibbar.
2. **SMTP-Passwörter können im Browser gespeichert, aber nicht zurückgelesen werden.** Der spätere Versand liest sie nur auf dem Server.

## Technische Details
- Migration:
  - Tabelle `app_role` + `user_roles` mit `has_role()` (security definer).
  - Trigger auf `auth.users`: Der erste Nutzer bekommt die Rolle „admin“.
  - RPC `admin_exists()` (security definer, für anon aufrufbar, gibt nur true/false zurück).
  - Alle Tabellen mit GRANTs an authenticated und service_role, Policies über `has_role(auth.uid(),'admin')`.
  - Spaltenrecht SELECT auf `smtp_accounts.password` für authenticated entzogen.
  - `leads_settings`: Prüfung id=1 per Trigger, Startzeile wird eingefügt.
- E-Mail/Passwort-Login wird im Backend aktiviert (bei einem eigenen Projekt ggf. im Dashboard prüfen). Die Bestätigungs-Mail sollte für den ersten Admin deaktiviert sein, sonst muss die Adresse erst bestätigt werden.
- Routen:
  - `src/routes/login.tsx`
  - `src/routes/_authenticated/route.tsx` (Gate, `ssr:false`, Weiterleitung auf /login)
  - `_authenticated/admin.tsx` (Layout mit Sidebar + `<Outlet/>`)
  - `admin.index.tsx` (Weiterleitung)
  - `admin.overview.tsx`, `admin.accounts.tsx`, `admin.campaigns.tsx`, `admin.leads.tsx`, `admin.automation.tsx`
- `onAuthStateChange` im Root. Der Logout leert den Cache, meldet ab und leitet ersetzend auf /login weiter.
- Daten werden per React Query im Browser über den Supabase-Client geladen; der Zeilenschutz gilt.
- Login/Registrieren-Buttons auf der Landingpage verlinken auf /login.
- Die Aufgaben kommen in die `roadmap.md`.
