// Entry module — Patchwork reads this array (in a worker) to list plugins.
// Only serializable metadata at the top level; all code lives behind load().
export const plugins = [
  {
    type: "patchwork:datatype",
    id: "lopecode-notebook",
    name: "Lopecode Notebook",
    icon: "Notebook",
    async load() {
      return (await import("./datatype.js")).LopecodeNotebookDatatype;
    },
  },
  {
    type: "patchwork:tool",
    id: "lopecode-notebook",
    name: "Lopecode Notebook",
    icon: "Notebook",
    supportedDatatypes: ["lopecode-notebook"],
    async load() {
      return (await import("./tool.js")).default;
    },
  },
];
