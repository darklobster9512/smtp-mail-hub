# Update auf dem Server ohne Build-Fehler

Der Fehler kommt von `npm run build`. Dieser Befehl baut die Version für das Cloudflare-Hosting. Auf deinem Server fehlt dieser Baustein. Dein Server läuft aber im Vorschau-Modus (pm2 startet direkt den Dev-Server), deshalb brauchst du den Build gar nicht. Am Projekt muss nichts geändert werden.

## Update-Befehle (zum Kopieren, als eine Zeile)

```
cd ~/smtp-mail-hub && git pull && npm install && pm2 restart smtp-mail-hub
```

Danach mit `pm2 logs smtp-mail-hub --lines 20` prüfen. Dort sollte "ready" und 127.0.0.1:8080 stehen.

## Falls du doch einen Build brauchst
`npm run build:dev` statt `npm run build`. Dabei wird der Server-Ersatz für Mailverbindungen genutzt.
