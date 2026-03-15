#!/bin/sh
# Ensure PORT is set so serve -l always gets a valid value (avoids
# "Unknown --listen endpoint scheme (protocol): undefined").
export PORT="${PORT:-3000}"
LISTEN="tcp://0.0.0.0:${PORT}"
echo "TrackVibe frontend: listening on ${LISTEN}"
exec npx serve dist -s -l "${LISTEN}"
