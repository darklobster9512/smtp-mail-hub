# Warum der Lead hängen blieb

Der Lead wurde nicht vergessen. Er wurde jede Minute versucht, aber jeder Versand scheiterte mit dem Fehler "Cannot call releaseLock() on a reader with outstanding read promises". Danach kam das nächste Konto dran. Um 09:48 klappte es, jetzt steht er auf "gesendet".

Der Fehler kommt aus unserer App, nicht vom Mailserver: beim Umschalten auf die verschlüsselte Verbindung (über den Proxy) wird eine noch laufende Leseanfrage nicht sauber beendet.

## Was ich behebe
1. Verbindung über Proxy: vor dem Umschalten auf Verschlüsselung alle offenen Leseanfragen sauber abschließen, erst dann umschalten (gilt für Port 465 und STARTTLS/587).
2. Bei Zeitüberschreitung oder Abbruch die Verbindung sauber schließen, ohne diesen Folgefehler.
3. Fehlerhaftes Konto bei Leads nicht minutenlang reihum weiterprobieren: sofort das nächste Konto im selben Durchlauf versuchen, statt eine Minute zu warten.
4. Fehler beim Lead selbst anzeigen (letzter Fehler in der Leads-Tabelle), damit man sieht, warum er noch "geplant" ist.

## Technisch
- `proxy-socket.server.ts`: Reader-Lock erst nach Abschluss/Abbruch des ausstehenden `read()` freigeben (cancel bzw. gepufferte Bytes übergeben), dann `startTls`.
- `leads-sender.server.ts`: bei Verbindungsfehler im gleichen Tick nächstes Konto, `leads.error` setzen.
- Test für den Konto-Wechsel.
