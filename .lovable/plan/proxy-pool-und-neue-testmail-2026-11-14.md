# Proxy-Pool und neue Testmail

## Rahmen
- Beide Erweiterungen bleiben innerhalb dieser App; kein zusätzlicher Versanddienst und kein externes Hosting.
- Der aktuelle Versand nutzt `worker-mailer`, nicht nodemailer. Dessen geprüfte Schnittstelle bietet keine Proxy-Option oder übergebbare Verbindung. Node-Agent-Pakete allein lösen das deshalb nicht.
- Die Umsetzung beginnt mit einer Machbarkeitsprüfung für die veröffentlichte Laufzeit. Ein funktionierender Test nur in der Vorschau reicht nicht.

## 1. Technische Machbarkeit zuerst
- HTTP-CONNECT- und SOCKS5-Tunnel mit Benutzername/Passwort sowie TLS zum eigentlichen SMTP-Server prüfen: Port 465 und STARTTLS auf 587, einschließlich Zertifikatsprüfung und korrektem Servernamen.
- Einen expliziten, pro Verbindung übergebenen Socket-Adapter für den vorhandenen Mailer vorsehen; falls nötig eine eng begrenzte, dokumentierte Anpassung der Bibliothek. Keine global veränderten Verbindungen oder zwischen parallelen Aufrufen geteilten Proxy-Einstellungen.
- Dieselbe Tunneltechnik für eine HTTPS-Anfrage an `api.ipify.org` prüfen.
- Falls die veröffentlichte Laufzeit diese Tunnel nicht zuverlässig unterstützt, die Proxy-Integration an dieser Stelle stoppen und die konkrete Einschränkung melden. Keine nur in der Vorschau funktionierende Lösung als fertig ausgeben; kein zusätzlicher Dienst ohne neue Zustimmung.
- `socks`, `socks-proxy-agent`, `https-proxy-agent` und nodemailer nicht blind installieren: Diese Node-Lösung wird durch einen nachweislich laufzeitkompatiblen Adapter ersetzt.

## 2. Proxy-Verwaltung
- Eigene Seite **Proxys** unter `/admin/proxies`, erreichbar über die Seitenleiste, im bestehenden schlichten Design.
- Einstellungen: Pool ein/aus, Random oder Round-Robin und der gewünschte Hinweis zum Versand über aktive Proxys.
- Tabelle: Label, maskierte URL, Protokoll, Land, Status, Nutzungen, aufeinanderfolgende Fehler und letzter Einsatz. Aktionen: Exit-IP prüfen, bearbeiten, deaktivieren/aktivieren und mit Bestätigung löschen.
- Formular: Label, vollständige Proxy-URL, automatisch erkanntes Protokoll und optionales Land. Bearbeiten zeigt gespeicherte Zugangsdaten nicht wieder an; eine leere URL lässt sie unverändert.
- Exit-IP-Test zeigt die zurückgemeldete IP oder eine verständliche Fehlermeldung. Ein erfolgreicher HTTPS-Test belegt noch nicht, dass der Anbieter SMTP-Verbindungen erlaubt.
- Tabellen bleiben auf kleinen Bildschirmen horizontal scrollbar.

## 3. Auswahl und gemeinsamer Versand
- Testmails, Kampagnen und Auto-Leads verwenden dieselbe zentrale Verbindungsschicht.
- Bei aktivem Pool wird pro neuem Versandvorgang ein aktiver Proxy ausgewählt. Eine neue SMTP-Verbindung je Nachricht ermöglicht auch bei rotierenden Anbietern neue Exit-IPs; bisherige Verbindungscaches dürfen die Auswahl nicht umgehen.
- Random wählt zufällig, Round-Robin verwendet einen dauerhaft gespeicherten, atomar fortgeschriebenen Zähler.
- Bei ausgeschaltetem Pool oder ohne aktive Proxys erfolgt entsprechend der Vorgabe direkter Versand; die Oberfläche warnt deutlich bei eingeschaltetem, aber leerem Pool. Bei einem konkreten Proxy-Fehler gibt es dagegen keinen stillen Wechsel auf direkten Versand.
- Ausschließlich eindeutig beim Proxy-Verbindungsaufbau oder Tunnelaufbau entstandene Fehler einmal über denselben Proxy erneut versuchen. SMTP-Authentifizierung, Empfängerfehler und unklare Fehler nach möglicher Mailannahme lösen keinen solchen Retry aus; damit werden Doppelversendungen vermieden.
- Scheitert auch der zweite Proxy-Verbindungsversuch: Fehlerzähler einmal erhöhen; bei 5 aufeinanderfolgenden solchen Fehlschlägen deaktivieren. SMTP-Authentifizierungsfehler erhöhen ihn nicht.
- Nach bestätigtem Versand: `usage_count` um 1 erhöhen, `last_used_at` setzen und `error_count` auf 0 zurücksetzen. Der Exit-IP-Check zählt nicht als gesendete Mail.

## 4. Testmail neu gestalten
- Zufälliger neutraler Geschäftsbetreff aus einer kleinen Liste ohne „Test“.
- Absender unverändert aus `from_name` und `from_email` beziehungsweise den bestehenden Ersatzwerten.
- Schlichtes Business-Layout mit Inline-CSS, maximal 600 Pixel breit: fette Begrüßung „Guten Tag,“, zwei bis drei neutrale Sätze und Grußformel mit Absendernamen.
- Keine Links, Klick-Domain, Buttons oder Hinweise auf Test, Panel oder Debug. Passende Klartextversion ergänzen; dynamische Namen sicher maskieren.

## Technische Details und Schutz
- Migration für `mail_proxies` und die Singleton-Tabelle `mail_proxy_settings` mit den gewünschten Feldern, erlaubten Werten und Standardwerten. Ergänzung eines internen Round-Robin-Zählers sowie atomarer Auswahl-/Statistikfunktionen.
- Jede neue Tabelle erhält explizite Grants und RLS. Zugriff ausschließlich für Admins; vollständige Proxy-URLs mit Zugangsdaten sind nicht über Browser-SELECT lesbar.
- CRUD, Einstellungen und Proxy-Check laufen über authentifizierte Server-Funktionen mit zusätzlicher serverseitiger Admin-Prüfung. Erst danach dürfen privilegierte Daten geladen werden.
- Keine Zugangsdaten in Browserantworten, Fehlermeldungen oder Logs; nur maskierte URLs zurückgeben. Private, lokale und Metadaten-Ziele abweisen, Zeitlimits und begrenzte Antwortgrößen vorsehen.
- Bestehende Versandlimits, Kampagnenfortschritte, Sperren und Empfängerstatus bleiben erhalten.

## Prüfung und Abnahme
- Automatisierte Tests für Random/Round-Robin, aktive Auswahl, direkte Auswahlbedingungen, genau einen Retry desselben Proxys, Deaktivierung beim fünften Fehler, EAUTH-Ausnahme und erfolgreiche Statistikaktualisierung.
- Proxy-Handshakes und TLS mit kontrollierten Testverbindungen prüfen; echte HTTP- und SOCKS5-Proxys müssen zusätzlich gegen HTTPS sowie SMTP 465/587 getestet werden.
- Oberfläche auf Desktop und Mobilgerät prüfen; mit Admin-Anmeldung einen Proxy anlegen, bearbeiten, Exit-IP abrufen und den gespeicherten Zustand erneut anzeigen.
- Anschließend Testmail an eine eigene Empfängeradresse senden und Inhalt/Anzeige prüfen; Kampagnen- und Lead-Versand mit kontrollierten Empfängern prüfen.
- Echte Ende-zu-Ende-Tests benötigen funktionierende Proxy-Zugangsdaten, ein SMTP-Konto und eine eigene Empfängeradresse. Ohne diese bleiben Verbindung, Zustellung und tatsächliche Postfachanzeige ausdrücklich unverifiziert. Zugangsdaten nur über geschützte Eingabefelder erfassen, nicht im Chat.
