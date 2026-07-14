#!/bin/bash
# Robust keep-alive script for Next.js standalone server
cd /home/z/my-project/.next/standalone

while true; do
  echo "[$(date)] Starting Next.js standalone server..."
  node server.js > /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 1 second..."
  sleep 1
done
