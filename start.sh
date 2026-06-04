#!/usr/bin/env bash
# Pitch Coach Pro — enkel startknapp.
# Öppna Terminal, gå till den här mappen och kör:  bash start.sh
# Scriptet installerar allt som behövs första gången, frågar efter din API-nyckel
# och startar både servern och appen. Stäng med Ctrl+C.

set -e
cd "$(dirname "$0")"

echo ""
echo "  Pitch Coach Pro — startar upp"
echo "  --------------------------------"

# 1. Finns Node.js installerat?
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  ⚠  Node.js saknas på datorn."
  echo "     Installera det gratis här:  https://nodejs.org  (välj 'LTS')"
  echo "     Kör sedan 'bash start.sh' igen."
  echo ""
  exit 1
fi

# 2. Har vi en .env-fil med API-nyckeln? Om inte — fråga efter den.
if [ ! -f .env ]; then
  echo ""
  echo "  Första gången behöver jag din Anthropic API-nyckel."
  echo "  Hämta/skapa en här:  https://console.anthropic.com  ->  'API Keys'"
  echo "  (Den börjar med  sk-ant-... )"
  echo ""
  read -r -p "  Klistra in nyckeln här och tryck Enter: " APIKEY
  {
    echo "ANTHROPIC_API_KEY=${APIKEY}"
    echo "MODEL=claude-sonnet-4-6"
    echo "PORT=8787"
  } > .env
  echo "  ✓ Nyckeln sparad i filen .env (delas aldrig, syns bara på din dator)."
fi

# 3. Installera beroenden första gången (tar någon minut).
if [ ! -d server/node_modules ]; then
  echo ""
  echo "  Installerar serverdelen (engångsgrej)…"
  (cd server && npm install --silent)
fi
if [ ! -d web/node_modules ]; then
  echo "  Installerar appdelen (engångsgrej)…"
  (cd web && npm install --silent)
fi

# 4. Starta servern i bakgrunden, stäng den automatiskt när du avslutar.
echo ""
echo "  Startar servern…"
(cd server && npm start) &
SERVER_PID=$!
trap 'echo ""; echo "  Stänger ner…"; kill $SERVER_PID 2>/dev/null || true' EXIT

sleep 2

# 5. Öppna webbläsaren automatiskt (Mac) och starta appen.
( sleep 3 && (open http://localhost:5173 2>/dev/null || true) ) &

echo ""
echo "  ✓ Klart! Appen öppnas i webbläsaren om en stund."
echo "    Om den inte gör det: öppna Chrome eller Edge och gå till"
echo "    http://localhost:5173"
echo ""
echo "    (Använd Chrome eller Edge — det krävs för att tala in pitchen.)"
echo "    Avsluta allt med Ctrl+C."
echo ""

# 6. Starta appen (håller fönstret igång).
cd web && npm run dev
