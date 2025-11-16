# Game backend (socket.io) scaffold

This repository contains a minimal Node.js + Express + Socket.IO backend for pairing players in simple realtime games (example: Pong).

Run locally:

```bash
# install dependencies
npm install

# start server
npm start
```

Docker:

```bash
# build image
docker build -t game-backend .

# run container
docker run -p 3000:3000 game-backend
```

Deploy options:
- Render / Railway / Fly: push this repo and set `PORT` env var (default 3000).
- Docker host: use the Dockerfile above.

Next steps:
- Add persistent user accounts + database if you need player persistence.
- Add authentication and room lifecycle improvements for production.
CI / Deployment (Fly.io)

I can deploy this app to Fly.io (recommended for WebSocket apps). You have a domain `waterryblock.game` — here are concise steps to finish the deployment after you create a Fly account.

Local quick deploy (manual):

```bash
# install flyctl: https://fly.io/docs/hands-on/install-flyctl/
flyctl auth login
flyctl apps create waterryblock-game
flyctl deploy
```

Add your domain to Fly and configure DNS (from your DNS provider control panel):

```bash
flyctl domains add waterryblock.game
# Fly will print the DNS target; create a CNAME pointing your domain to that target.
# If you need to use the root/apex, use an ANAME/ALIAS record or add the A records Fly provides.
```

Automated deploy via GitHub Actions (recommended):

1. Push this repo to GitHub on `main`.
2. Create a Fly API token: `flyctl auth token` and add it to your repository's Secrets as `FLY_API_TOKEN`.
3. On push to `main`, GitHub Actions will run `.github/workflows/fly-deploy.yml` and deploy to Fly.

Notes:
- You must set the custom domain DNS at your registrar — DNS changes can take time to propagate.
- For an apex domain (no `www`), use ANAME/ALIAS if your DNS provider supports it; otherwise point to the A records Fly provides.
- If you prefer another host (Render / Railway), tell me and I can add an alternate workflow or instructions.

# site