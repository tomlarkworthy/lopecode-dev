Request a metadev restart. The metadev wrapper will execute any pre-restart commands
(outside the sandbox) and relaunch Claude, resuming the same session.

Write a restart descriptor then exit. The restart file path is **per-instance** to support
parallel sessions: `/tmp/metadev-restart-$METADEV_CORRELATION_ID.json`

Read `$METADEV_CORRELATION_ID` from the environment to construct the path.

Descriptor format:

```json
{
  "resume": true,
  "reason": "short explanation shown to user",
  "commands": ["command1", "command2"]
}
```

Fields:
- `resume` (bool): true to resume this session (default), false for a fresh start
- `reason` (string): shown to the user in the terminal
- `commands` (array of strings): executed interactively in the user's shell BEFORE relaunch.
  The user is shown the commands and asked to confirm. Use for things that need to run
  outside the sandbox (e.g., `assume <profile>` for AWS creds).

Steps:
1. Read `$METADEV_CORRELATION_ID` from the environment
2. Write the restart descriptor to `/tmp/metadev-restart-$METADEV_CORRELATION_ID.json`
3. Exit by running `kill $PPID` via Bash to trigger the restart

metadev finds the correct session to resume by grepping session logs for the correlation ID
(emitted by the SessionEnd hook). This works across `/clear` and session switches.

## Examples

### AWS credentials expired / switch account
**IMPORTANT**: Never use `assume <profile>` in commands — it spawns a subshell via
`aws-vault exec` and env vars are lost when the subshell exits. Instead, use
`aws-vault exec --json` to capture credentials and export them inline.

The command pattern for switching AWS profiles:
```
unset AWS_VAULT && CREDS=$(aws-vault exec --prompt ykman <PROFILE> -d <DURATION> --json) && export AWS_ACCESS_KEY_ID=$(echo $CREDS | python3 -c \"import sys,json; print(json.load(sys.stdin)['AccessKeyId'])\") && export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | python3 -c \"import sys,json; print(json.load(sys.stdin)['SecretAccessKey'])\") && export AWS_SESSION_TOKEN=$(echo $CREDS | python3 -c \"import sys,json; print(json.load(sys.stdin)['SessionToken'])\") && export AWS_VAULT=<PROFILE>
```

Duration: `8h` for read roles, `2h` for `*on-call-engineer-write*` roles.

```bash
CID=$(printenv METADEV_CORRELATION_ID)
cat > /tmp/metadev-restart-${CID}.json << 'RESTART'
{"resume": true, "reason": "AWS credentials expired", "commands": ["unset AWS_VAULT && CREDS=$(aws-vault exec --prompt ykman decide-dp-devcluster-optimize.core-engineer -d 8h --json) && export AWS_ACCESS_KEY_ID=$(echo $CREDS | python3 -c \"import sys,json; print(json.load(sys.stdin)['AccessKeyId'])\") && export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | python3 -c \"import sys,json; print(json.load(sys.stdin)['SecretAccessKey'])\") && export AWS_SESSION_TOKEN=$(echo $CREDS | python3 -c \"import sys,json; print(json.load(sys.stdin)['SessionToken'])\") && export AWS_VAULT=decide-dp-devcluster-optimize.core-engineer"]}
RESTART
```
Then exit by running `kill $PPID` via Bash.

### Sandbox config changed (e.g., new grant added to metadev)
```bash
CID=$(printenv METADEV_CORRELATION_ID)
cat > /tmp/metadev-restart-${CID}.json << 'RESTART'
{"resume": true, "reason": "sandbox config updated — restart to apply"}
RESTART
```

### Fresh start needed
```bash
CID=$(printenv METADEV_CORRELATION_ID)
cat > /tmp/metadev-restart-${CID}.json << 'RESTART'
{"resume": false, "reason": "starting fresh session"}
RESTART
```

## Important
- NEVER use `assume <profile>` in commands — it spawns a subshell and creds are lost. Use the `aws-vault exec --json` pattern above instead.
- For the default dev profile, use the profile from `workspace-services/.tktl-local.yaml` — never hardcode
- Commands run OUTSIDE the sandbox with user confirmation — keep them minimal and safe
- $ARGUMENT is the user's instruction for what to restart (e.g., "refresh aws creds")
