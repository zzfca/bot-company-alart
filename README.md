# Bot Company Alart

A small company compliance tracker for BC company filings, annual returns, GST reminders, and email notifications.

## Features

- Admin login and password change
- Company registry with annual filing, annual return, and GST tracking
- Automatic reminder date calculation
- SMTP notification settings
- Send Test Email button for validating SMTP configuration
- SQLite persistence
- Docker-ready production deployment

## Default Login

The first admin user is created automatically on startup.

- Email: `admin@company.com`
- Password: value of `ADMIN_PASSWORD`, or `admin123` if not set

Change the password after first login.

## Local Development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

The API server runs on port `3000` and the Vite dev server proxies `/api` requests.

## Production Build

```bash
npm run build
npm run build:server
npm start
```

Open:

```text
http://127.0.0.1:3000
```

## Docker Build

Build the image locally:

```bash
docker build -t bot-company-alart:latest .
```

Run it:

```bash
docker run -d \
  --name bot-company-alart \
  -p 3000:3000 \
  -v bot-company-alart-data:/data \
  -e ADMIN_PASSWORD='change-me' \
  -e SESSION_SECRET='replace-with-a-long-random-string' \
  bot-company-alart:latest
```

Open:

```text
http://SERVER_IP:3000
```

## Docker Compose

Copy `.env.example` to `.env` and edit the values:

```bash
cp .env.example .env
```

Start:

```bash
docker compose up -d --build
```

Stop:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f
```

## Deploy On Ubuntu From GitHub Source

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker

git clone https://github.com/zzfca/bot-company-alart.git
cd bot-company-alart
cp .env.example .env
nano .env

docker compose up -d --build
```

Then open:

```text
http://SERVER_IP:3000
```

## Deploy From A Published Docker Image

After pushing this repository to GitHub, the included GitHub Actions workflow publishes an image to GitHub Container Registry:

```text
ghcr.io/zzfca/bot-company-alart:latest
```

On Ubuntu, create a `docker-compose.yml` file:

```yaml
services:
  app:
    image: ghcr.io/zzfca/bot-company-alart:latest
    ports:
      - "3000:3000"
    environment:
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-admin123}
      SESSION_SECRET: ${SESSION_SECRET:-change-this-session-secret}
      DB_PATH: /data/database.sqlite
    volumes:
      - ./data:/data
    restart: unless-stopped
```

Then run:

```bash
docker compose pull
docker compose up -d
```

## SMTP Settings

Configure email under `Settings` in the app.

Common ports:

- `587`: STARTTLS
- `465`: SSL/TLS
- `994`: SSL/TLS for some 163 enterprise mail setups

Use `Send Test Email` after saving SMTP settings. A successful test confirms that scheduled reminder emails can use the same SMTP configuration.

## Data Persistence

SQLite data is stored at `/data/database.sqlite` inside the container. The provided Compose file maps it to `./data` on the host.

Back up the `data` directory before moving servers or upgrading.

## Environment Variables

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | HTTP port inside container |
| `ADMIN_PASSWORD` | No | `admin123` | Initial admin password for first startup |
| `SESSION_SECRET` | Yes | development fallback | Express session signing secret |
| `DB_PATH` | No | `/data/database.sqlite` in Docker | SQLite database path |
