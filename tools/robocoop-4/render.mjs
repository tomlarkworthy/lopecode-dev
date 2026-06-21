// Shared bash-output rendering: node and browser must produce byte-identical text.

export function formatResult(r) {
  if (!r) return '(no output)';
  const parts = [];
  const stdout = r.stdout ?? '';
  const stderr = r.stderr ?? '';
  if (stdout) parts.push(stdout.replace(/\n$/, ''));
  if (stderr) parts.push(stderr.replace(/\n$/, ''));
  const exit = r.exitCode ?? 0;
  if (exit !== 0) parts.push('[exit ' + exit + ']');
  if (parts.length === 0) return '(no output)';
  return parts.join('\n');
}

// Head+tail cap; replaces the middle so a 1MB cat cannot blow the model context.
export function truncate(text, limit) {
  const s = String(text ?? '');
  if (!limit || s.length <= limit) return s;
  const head = Math.ceil(limit / 2);
  const tail = Math.floor(limit / 2);
  const cut = s.length - head - tail;
  return (
    s.slice(0, head) +
    '\n...[' + cut + ' bytes truncated — use grep/sed to narrow]...\n' +
    s.slice(s.length - tail)
  );
}
