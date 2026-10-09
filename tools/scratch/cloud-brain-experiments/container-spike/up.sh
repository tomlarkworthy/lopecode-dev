set -e
cd "$(dirname "$0")"
A=$(grep -o '"account[A-Za-z]*": *"[0-9a-f]\{32\}"' ../../../cloud-brain/.emitted/cb4.json | head -1 | grep -o '[0-9a-f]\{32\}')
T=$(cat ../.cf-token); N=cb4-scratch-box
[ -f .key ] || openssl rand -hex 16 > .key
META=$(cat <<M
{"main_module":"worker.js","compatibility_date":"2026-09-01","bindings":[{"type":"durable_object_namespace","name":"BOX","class_name":"Box"},{"type":"plain_text","name":"KEY","text":"$(cat .key)"}],"migrations":{"new_tag":"v1","new_sqlite_classes":["Box"]},"containers":[{"class_name":"Box"}]}
M
)
[ "$1" = "again" ] && META=$(echo "$META" | sed 's/,"migrations":{[^}]*}//')
curl -s -X PUT -H "Authorization: Bearer $T" "https://api.cloudflare.com/client/v4/accounts/$A/workers/scripts/$N" -F "metadata=$META;type=application/json" -F "worker.js=@worker.js;type=application/javascript+module" | sed "s/$A/<acct>/g" | head -c 500; echo
curl -s -X POST -H "Authorization: Bearer $T" -H "content-type: application/json" "https://api.cloudflare.com/client/v4/accounts/$A/workers/scripts/$N/subdomain" -d '{"enabled":true,"previews_enabled":false}' | head -c 200; echo
