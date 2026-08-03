// Datatype: a lopecode notebook stored as source in an Automerge document.
//
// The document holds notebook *source* — never runtime values. Cell bodies are
// text (Automerge merges concurrent text edits); the Observable runtime derives
// the reactive state from that source. This is the clean seam between the two
// systems: Automerge owns the source, Observable owns the compute.
//
// @typedef {{ inputs: string[], body: string }} Cell   // body = function source text
// @typedef {{ title: string, order: string[], cells: Record<string, Cell> }} NotebookDoc

export const LopecodeNotebookDatatype = {
  init(doc) {
    doc.title = "Untitled notebook";
    doc.order = ["count", "doubled", "view"];
    doc.cells = {
      count: { inputs: [], body: "return 3" },
      doubled: { inputs: ["count"], body: "return count * 2" },
      view: {
        inputs: ["count", "doubled"],
        body:
          "const el = document.createElement('div');" +
          "el.textContent = `${count} doubled is ${doubled}`;" +
          "return el;",
      },
    };
  },
  getTitle(doc) {
    return doc.title || "Lopecode Notebook";
  },
  setTitle(doc, title) {
    doc.title = title;
  },
  markCopy(doc) {
    doc.title = "Copy of " + this.getTitle(doc);
  },
};
