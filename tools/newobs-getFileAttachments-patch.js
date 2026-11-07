module => {
  let fileMap;
  let FileAttachment = module._builtins.get('FileAttachment');
  // new.observablehq.com stores the builtin in definition form, [() => FileAttachment]
  if (Array.isArray(FileAttachment)) {
    try { FileAttachment = FileAttachment[FileAttachment.length - 1](); } catch (e) {}
  }
  const backup_get = Map.prototype.get;
  const backup_has = Map.prototype.has;
  Map.prototype.has = Map.prototype.get = function (...args) {
    fileMap = this;
  };
  try {
    FileAttachment('');
  } catch (e) {
  }
  Map.prototype.has = backup_has;
  Map.prototype.get = backup_get;
  // notebook-kit entries are {name, href, mimeType}; lopemodule reads .url
  if (fileMap && [...fileMap.values()].some(f => f && typeof f === 'object' && !f.url && f.href))
    return new Map([...fileMap].map(([k, f]) => [k, f && typeof f === 'object' && !f.url && f.href ? {...f, url: f.href} : f]));
  return fileMap;
}
