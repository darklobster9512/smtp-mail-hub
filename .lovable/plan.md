# Server-Schlüssel ohne Cron-Secret

Du brauchst kein Cron-Secret. Es wird nur für einen optionalen externen Timer genutzt, und der ist hier nicht im Einsatz: Kampagnen laufen, solange das Admin-Panel offen ist, und Leads werden automatisch über die Lead-Schnittstelle verschickt.

## Befehl auf dem Server (nur der Service-Role-Key)

```text
cd ~/smtp-mail-hub
printf 'SUPABASE_SERVICE_ROLE_KEY=DEIN_KEY\n' > .env.local
pm2 restart smtp-mail-hub
```

Ersetze DEIN_KEY durch den Service-Role-Key aus deinem Supabase-Projekt (Project Settings -> API -> service_role).

## Falls du später doch einen externen Timer willst

Dann kannst du dir selbst irgendeinen langen Zufallswert ausdenken, ihn als zweite Zeile `CRON_SECRET=...` eintragen und denselben Wert beim Timer angeben. Das ist optional.

## Am Code ändert sich nichts.
