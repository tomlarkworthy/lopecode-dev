const line = () => 'a,"b,c",d,"say ""hi"""';

const parseCsv = () => (s: string): string[] => {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < s.length) {
    const c = s[i] ?? "";
    if (quoted) {
      if (c === '"') {
        if ((s[i + 1] ?? "") === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
    i++;
  }
  out.push(field);
  return out;
};

const parsed = (line: string, parseCsv) => parseCsv(line);
