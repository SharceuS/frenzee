#!/bin/bash
# ─── Pocket Party – start all servers ──────────────────────────
echo "🎉 Starting Pocket Party..."

# Kill leftover processes on our ports
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Start backend
echo "🚀 Starting backend on :4000 ..."
cd "$(dirname "$0")/backend"
node server.js &
BACKEND_PID=$!

sleep 1

# Start frontend
echo "🌐 Starting frontend on :3001 ..."
cd "$(dirname "$0")/frontend"
npm run dev -- -p 3001 &
FRONTEND_PID=$!

echo ""
echo "✅ Pocket Party is live!"
echo "   Frontend → http://localhost:3001"
echo "   Backend  → http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop everything."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" SIGINT SIGTERM
wait
