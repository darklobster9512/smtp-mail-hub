# Deployment auf Debian 12 VPS (shopmanagement.lol)

## Problem vorab
Die App wird aktuell für Cloudflare Workers gebaut. Der Mailversand nutzt `cloudflare:sockets`, das es auf einem normalen Server (Node) nicht gibt. Ohne Anpassung würde auf dem VPS jeder Mailversand fehlschlagen.

## Schritt 1: kleine Anpassung im Projekt (mache ich nach Freigabe)
- Neues Build-Kommando `build:node`: baut die App als Node-Server (Nitro-Preset `node-server`) und nutzt dabei die vorhandene Node-Socket-Variante für SMTP und Proxies.
- `runInBackground`: ohne Workers-Kontext läuft die Aufgabe einfach weiter (auf Node ok, bleibt kompatibel).
- Lovable-Vorschau und Cloudflare-Build bleiben unverändert.

## Schritt 2: Befehle für den Server (bekommst du danach komplett)
```text
# als root
apt update && apt upgrade -y
apt install -y git curl unzip nginx certbot python3-certbot-nginx ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
curl -fsSL https://bun.sh/install | bash && source ~/.bashrc
npm i -g pm2

ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

mkdir -p /var/www && cd /var/www
git clone https://github.com/darklobster9512/smtp-mail-hub.git
cd smtp-mail-hub
# .env kommt schon ueber GitHub mit (Supabase-Adresse + oeffentlicher Schluessel).
# Nur die 2 geheimen Werte einmalig per Befehl setzen (nicht in GitHub!):
printf 'SUPABASE_SERVICE_ROLE_KEY=DEIN_KEY\nCRON_SECRET=DEIN_SECRET\n' > .env.production.local
bun install
bun run build:node
PORT=3000 pm2 start .output/server/index.mjs --name smtp-mail-hub
pm2 save && pm2 startup

# nginx: /etc/nginx/sites-available/shopmanagement.lol -> proxy_pass http://127.0.0.1:3000
ln -s /etc/nginx/sites-available/shopmanagement.lol /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d shopmanagement.lol -d www.shopmanagement.lol

# Updates später
cd /var/www/smtp-mail-hub && git pull && bun install && bun run build:node && pm2 restart smtp-mail-hub
```
Dazu kommt die fertige nginx-Datei und eine Anleitung, woher du den Service-Role-Key nimmst.

## Warum nicht alles ueber GitHub
Die `.env` mit Supabase-Adresse und oeffentlichem Schluessel liegt bereits im Repo und wird mitgeklont. Der Service-Role-Key gibt vollen Zugriff auf die Datenbank inkl. SMTP-Passwoertern. Im Repo waere er fuer jeden mit Zugriff lesbar. Deshalb einmalig auf dem Server per einem Befehl, ohne Editor. `.env.production.local` ist per `*.local` von Git ausgeschlossen und bleibt bei `git pull` erhalten.

## Voraussetzungen bei dir
- DNS: A-Record für `shopmanagement.lol` und `www` auf die VPS-IP.
- Mail-Ports: viele VPS-Anbieter sperren ausgehend 25/465/587; ggf. beim Anbieter freischalten lassen.

## Technische Details
- `vite.config.ts`: Shim-Plugin auch aktiv, wenn `DEPLOY_TARGET=node`; Nitro-Preset per Env auf `node-server`.
- `.output/server/index.mjs` ist der Node-Einstieg; Port per `PORT`.
- Neue Regel in AGENTS.md zum Node-Build.
