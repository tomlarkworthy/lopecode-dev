async (rt) => {
  const val = (n) => [...rt._variables].find((v) => v._name === n && v._value !== undefined)?._value;
  const task = val("task");
  const specs = val("module_specs");
  const names = val("moduleNames");
  return {
    taskNotebook: task?.notebook,
    mainsKeys: task?.mains ? [...task.mains.keys()] : null,
    mainFilesOpt: task?.options?.main_files,
    specKeys: specs ? [...specs.keys()].slice(0, 5) : null,
    specFiles: specs ? [...specs.entries()].filter(([, s]) => s.fileAttachments?.size).map(([k, s]) => [k, [...s.fileAttachments.keys()]]) : null,
    mainName: names ? [...names.values()].find((i) => i.module === [...rt._variables].find((v) => v._name === "nkTestView")?._module)?.name : null,
  };
}
