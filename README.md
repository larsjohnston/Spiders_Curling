# Spiders Curling

A small installable web app for the team: who's playing each game, scores, and a push
notification the evening before every game with the opponent and the four playing.

- **Anyone with the link** can view the schedule, lineups and results.
- **Editing** (games, lineups, scores, roster) needs the shared team PIN.
- **Reminders** go out daily at 00:00 UTC (6pm MDT / 5pm MST) for games on the next
  calendar day in Calgary time. Each person's push says whether they're playing or sitting out.

## For the guys: install on iPhone

1. Open the site in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open **Spiders** from the Home Screen, tap **Me**, pick your name, tap **Turn on notifications**.
4. Tap **Send test** to make sure it works.

(Requires iOS 16.4 or newer. Android/desktop Chrome works without installing.)

## Setup

1. **Supabase**: create a project and run `supabase/migrations/0001_init.sql` in the SQL editor.
   It seeds six placeholder players; rename them on the **Roster** page after unlocking.
2. **VAPID keys**: `npx web-push generate-vapid-keys`
3. **Vercel**: import this repo and set the env vars listed in `.env.example`.
   `vercel.json` registers the daily cron; Vercel sends `CRON_SECRET` automatically.

## Development

```bash
cp .env.example .env.local   # fill in
npm install
npm run dev
npm run typecheck && npm run lint && npm test
```

Trigger the reminder job by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

Team name and timezone live in `lib/config.ts`.
