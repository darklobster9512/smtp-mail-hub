# Fix: "This page didn't load" auf dem VPS

## Ursache
Auf dem Server ist Node.js 20 installiert (`setup_20.x`). Die Datenbank-Verbindung braucht Node.js 22 oder neuer. Darum stuerzt jede Seite mit "native WebSocket not found" ab. Am Projekt muss dafuer nichts geaendert werden.

## Befehle auf dem Server (als root)
```text
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v            # muss v22.x zeigen

cd ~/smtp-mail-hub
rm -rf node_modules
npm install
pm2 delete smtp-mail-hub
pm2 start "npm run dev -- --host 127.0.0.1 --port 8080" --name smtp-mail-hub
pm2 save
pm2 startup        # ausgegebenen Befehl einmal ausfuehren
```

## Nginx anpassen (Ursache fuer 502 Bad Gateway)
Die App hoert jetzt nur noch auf 127.0.0.1, Nginx zeigt aber noch auf 131.123.34.73:8080. Darum 502.
```text
sed -i 's#proxy_pass http://131.123.34.73:8080;#proxy_pass http://127.0.0.1:8080;#' /etc/nginx/sites-available/shopmanagement.lol
```
In `/etc/nginx/sites-available/shopmanagement.lol`:
```text
proxy_pass http://127.0.0.1:8080;
```
Danach:
```text
nginx -t && systemctl reload nginx
```
So ist Port 8080 nicht mehr direkt von aussen erreichbar, nur ueber die Domain.

## Fehlende geheime Werte
Fuer Mailversand und Leads braucht der Server noch den Service-Role-Key (nicht in GitHub):
```text
cd ~/smtp-mail-hub
printf 'SUPABASE_SERVICE_ROLE_KEY=DEIN_KEY\nCRON_SECRET=DEIN_SECRET\n' > .env.local
pm2 restart smtp-mail-hub
```

## Hinweis fuer spaeter
Die App laeuft so im Entwicklungsmodus. Das funktioniert, ist aber langsamer. Optional baue ich danach einen echten Server-Build fuer den VPS (eigener Plan).
