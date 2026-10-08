#!/bin/bash
# q.sh MINUTES 'PARAMETERS_JSON' [limit] [queryId] [view]
now=$(($(date +%s)*1000)); from=$((now - $1*60000))
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.logs.query --owner -s -X POST -H 'content-type: application/json' -d "{\"queryId\":\"${4:-probe}\",\"timeframe\":{\"from\":$from,\"to\":$now},\"view\":\"${5:-events}\",\"limit\":${3:-100},\"parameters\":$2}"
