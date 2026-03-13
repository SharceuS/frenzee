#!/bin/bash
# ─── Frenzee – start all servers ──────────────────────────
ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "🎉 Starting Frenzee..."

# Kill leftover processes on our ports
echo "🔪 Clearing ports 4000, 3000, 3001..."
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

# Start backend
echo "🚀 Starting backend on :4000 ..."
cd "$ROOT/backend"
node index.js &
BACKEND_PID=$!

sleep 1

# Start frontend
echo "🌐 Starting frontend on :3001 ..."
cd "$ROOT/frontend"
npm run dev -- -p 3001 &
FRONTEND_PID=$!

echo ""
echo "✅ Frenzee is live!"
echo "   Frontend → http://localhost:3001"
echo "   Backend  → http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop everything."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" SIGINT SIGTERM
wait
