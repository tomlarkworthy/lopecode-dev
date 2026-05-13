const _intro_docs = function _intro_docs(md){return(
md`# Observable Inputs Reference

A live reference for every widget in [@observablehq/inputs](https://github.com/observablehq/inputs) — see the [official docs](https://observablehq.com/@observablehq/inputs).
`
)};

const _contents_docs = function _contents_docs(md,linkTo){return(
md`## Contents

**Choice** &nbsp; [\`radio\`](${linkTo("@tomlarkworthy/inputs-reference#radio_docs", {onObservable: false})}) · [\`checkbox\`](${linkTo("@tomlarkworthy/inputs-reference#checkbox_docs", {onObservable: false})}) · [\`toggle\`](${linkTo("@tomlarkworthy/inputs-reference#toggle_docs", {onObservable: false})}) · [\`select\`](${linkTo("@tomlarkworthy/inputs-reference#select_docs", {onObservable: false})})

**Numeric** &nbsp; [\`range\`](${linkTo("@tomlarkworthy/inputs-reference#range_docs", {onObservable: false})}) · [\`number\`](${linkTo("@tomlarkworthy/inputs-reference#number_docs", {onObservable: false})})

**Text** &nbsp; [\`text\`](${linkTo("@tomlarkworthy/inputs-reference#text_docs", {onObservable: false})}) · [\`textarea\`](${linkTo("@tomlarkworthy/inputs-reference#textarea_docs", {onObservable: false})}) · [\`search\`](${linkTo("@tomlarkworthy/inputs-reference#search_docs", {onObservable: false})})

**Date** &nbsp; [\`date\`](${linkTo("@tomlarkworthy/inputs-reference#date_docs", {onObservable: false})}) · [\`datetime\`](${linkTo("@tomlarkworthy/inputs-reference#datetime_docs", {onObservable: false})})

**Other** &nbsp; [\`color\`](${linkTo("@tomlarkworthy/inputs-reference#color_docs", {onObservable: false})}) · [\`file\`](${linkTo("@tomlarkworthy/inputs-reference#file_docs", {onObservable: false})}) · [\`button\`](${linkTo("@tomlarkworthy/inputs-reference#button_docs", {onObservable: false})})

**Composition** &nbsp; [\`form\`](${linkTo("@tomlarkworthy/inputs-reference#form_docs", {onObservable: false})}) · [\`bind\`](${linkTo("@tomlarkworthy/inputs-reference#bind_docs", {onObservable: false})}) · [\`table\`](${linkTo("@tomlarkworthy/inputs-reference#table_docs", {onObservable: false})}) · [\`input\`](${linkTo("@tomlarkworthy/inputs-reference#input_docs", {onObservable: false})}) · [utilities](${linkTo("@tomlarkworthy/inputs-reference#utilities_docs", {onObservable: false})})
`
)};

const _button_docs = function _button_docs(md){return(
md`### \`Inputs.button(content, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/button)

A clickable button.
`
)};
const _button_options = function _button_options(Inputs){return(
Inputs.table([
  { option: "label",    type: "string \\| HTMLElement", default: "—",        description: "Form label" },
  { option: "value",    type: "any",                   default: "0",         description: "Initial value" },
  { option: "reduce",   type: "(value) => any",        default: "v => (v||0)+1", description: "Applied on each click to derive the next value" },
  { option: "required", type: "boolean",               default: "true",      description: "If false, value may be undefined before first click" },
  { option: "disabled", type: "boolean",               default: "false",     description: "Disable the button" },
  { option: "width",    type: "number",                default: "—",         description: "Container width in pixels" }
], { layout: "auto", width: { description: 360 } })
)};
const _button_example = function _button_example(Inputs){return(
Inputs.button([["−", v => v - 1], ["reset", () => 0], ["+", v => v + 1]], { label: "counter", value: 0 })
)};

const _checkbox_docs = function _checkbox_docs(md){return(
md`### \`Inputs.checkbox(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/checkbox)

Zero or more values from a set.
`
)};
const _checkbox_options = function _checkbox_options(Inputs){return(
Inputs.table([
  { option: "label",    type: "string \\| HTMLElement",   default: "—",   description: "Form label" },
  { option: "value",    type: "array",                   default: "[]",  description: "Initially-selected items" },
  { option: "format",   type: "(d) => string \\| HTMLElement", default: "identity", description: "Render each option" },
  { option: "keyof",    type: "(d) => any",              default: "identity", description: "Identity for grouping / uniqueness" },
  { option: "valueof",  type: "(d) => any",              default: "identity", description: "Map selected items to a different value" },
  { option: "sort",     type: 'bool \\| "asc" \\| "desc" \\| fn', default: "false", description: "Sort options" },
  { option: "unique",   type: "boolean",                 default: "false", description: "De-duplicate options" },
  { option: "disabled", type: "boolean \\| array",        default: "false", description: "Disable all, or by item" }
], { layout: "auto", width: { description: 360 } })
)};
const _checkbox_example = function _checkbox_example(Inputs){return(
Inputs.checkbox(["apple", "banana", "cherry", "durian", "elderberry"], { label: "fruit", value: ["banana"] })
)};

const _radio_docs = function _radio_docs(md){return(
md`### \`Inputs.radio(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/radio)

Exactly one value from a set.
`
)};
const _radio_options = function _radio_options(Inputs){return(
Inputs.table([
  { option: "label",    type: "string \\| HTMLElement",   default: "—",   description: "Form label" },
  { option: "value",    type: "any",                     default: "null", description: "Initially-selected item" },
  { option: "format",   type: "(d) => string \\| HTMLElement", default: "identity", description: "Render each option" },
  { option: "keyof",    type: "(d) => any",              default: "identity", description: "Identity for grouping" },
  { option: "valueof",  type: "(d) => any",              default: "identity", description: "Map selection to a different value" },
  { option: "sort",     type: 'bool \\| "asc" \\| "desc" \\| fn', default: "false", description: "Sort options" },
  { option: "unique",   type: "boolean",                 default: "false", description: "De-duplicate options" },
  { option: "disabled", type: "boolean \\| array",        default: "false", description: "Disable all, or by item" }
], { layout: "auto", width: { description: 360 } })
)};
const _radio_example = function _radio_example(Inputs){return(
Inputs.radio(["S", "M", "L", "XL"], { label: "size", value: "M" })
)};

const _toggle_docs = function _toggle_docs(md){return(
md`### \`Inputs.toggle(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/toggle)

A single boolean switch.
`
)};
const _toggle_options = function _toggle_options(Inputs){return(
Inputs.table([
  { option: "label",    type: "string \\| HTMLElement", default: "—",          description: "Form label" },
  { option: "value",    type: "boolean",               default: "false",      description: "Initial value" },
  { option: "values",   type: "[falsey, truthy]",      default: "[false, true]", description: "Values returned for off / on" },
  { option: "disabled", type: "boolean",               default: "false",      description: "Disable the toggle" }
], { layout: "auto", width: { description: 360 } })
)};
const _toggle_example = function _toggle_example(Inputs){return(
Inputs.toggle({ label: "active", value: true })
)};

const _select_docs = function _select_docs(md){return(
md`### \`Inputs.select(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/select)

One (or many) values from a list, as a dropdown.
`
)};
const _select_options = function _select_options(Inputs){return(
Inputs.table([
  { option: "label",    type: "string \\| HTMLElement",   default: "—",       description: "Form label" },
  { option: "value",    type: "any \\| array",            default: "first",   description: "Initial selection" },
  { option: "multiple", type: "boolean \\| number",       default: "false",   description: "Multi-select; size = number if number" },
  { option: "size",     type: "number",                  default: "—",       description: "Visible row count if multiple" },
  { option: "format",   type: "(d) => string",           default: "identity", description: "Render each option" },
  { option: "keyof",    type: "(d) => any",              default: "identity", description: "Identity for grouping" },
  { option: "valueof",  type: "(d) => any",              default: "identity", description: "Map selection to a different value" },
  { option: "sort",     type: 'bool \\| "asc" \\| "desc" \\| fn', default: "false", description: "Sort options" },
  { option: "unique",   type: "boolean",                 default: "false",   description: "De-duplicate options" },
  { option: "required", type: "boolean",                 default: "true",    description: "If false, a blank entry is added" },
  { option: "disabled", type: "boolean",                 default: "false",   description: "Disable the select" }
], { layout: "auto", width: { description: 360 } })
)};
const _select_example = function _select_example(Inputs){return(
Inputs.select(new Map([["Switzerland", "CH"], ["United Kingdom", "GB"], ["United States", "US"], ["Japan", "JP"]]), { label: "country", value: "GB" })
)};

const _range_docs = function _range_docs(md){return(
md`### \`Inputs.range([min, max], options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/range)

A numeric slider with paired text input.
`
)};
const _range_options = function _range_options(Inputs){return(
Inputs.table([
  { option: "label",       type: "string \\| HTMLElement", default: "—",        description: "Form label" },
  { option: "value",       type: "number",                default: "midpoint", description: "Initial value" },
  { option: "step",        type: "number",                default: "(max−min)/100", description: "Step size; pass 1 for integers" },
  { option: "transform",   type: "(v) => v",              default: "identity", description: "Map slider position → value (e.g. Math.log)" },
  { option: "invert",      type: "(v) => v",              default: "inverse",  description: "Map value → slider position" },
  { option: "format",      type: "(v) => string",         default: "identity", description: "Format for the text input" },
  { option: "placeholder", type: "string",                default: "—",        description: "Placeholder text" },
  { option: "required",    type: "boolean",               default: "true",     description: "If false, value may be NaN" },
  { option: "disabled",    type: "boolean",               default: "false",    description: "Disable the slider" }
], { layout: "auto", width: { description: 360 } })
)};
const _range_example = function _range_example(Inputs){return(
Inputs.range([0, 100], { label: "volume", value: 42, step: 1 })
)};

const _number_docs = function _number_docs(md){return(
md`### \`Inputs.number([min, max]?, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/range)

A numeric input without a slider.
`
)};
const _number_options = function _number_options(Inputs){return(
Inputs.table([
  { option: "label",       type: "string \\| HTMLElement", default: "—",   description: "Form label" },
  { option: "value",       type: "number",                default: "NaN", description: "Initial value" },
  { option: "step",        type: "number",                default: "—",   description: "Increment for arrows / spinner" },
  { option: "placeholder", type: "string",                default: "—",   description: "Placeholder text" },
  { option: "required",    type: "boolean",               default: "true", description: "If false, blank → NaN" },
  { option: "disabled",    type: "boolean",               default: "false", description: "Disable the input" }
], { layout: "auto", width: { description: 360 } })
)};
const _number_example = function _number_example(Inputs){return(
Inputs.number([0, 10000], { label: "price", value: 99, step: 0.01 })
)};

const _text_docs = function _text_docs(md){return(
md`### \`Inputs.text(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/text)

A single-line text input. Variants: \`Inputs.email\`, \`Inputs.tel\`, \`Inputs.url\`, \`Inputs.password\` (same options, with \`type\` pre-set).
`
)};
const _text_options = function _text_options(Inputs){return(
Inputs.table([
  { option: "label",       type: "string \\| HTMLElement", default: "—",     description: "Form label" },
  { option: "value",       type: "string",                default: '""',     description: "Initial value" },
  { option: "placeholder", type: "string",                default: "—",     description: "Placeholder text" },
  { option: "type",        type: "string",                default: '"text"', description: "HTML input type (text, email, url, password, tel, …)" },
  { option: "spellcheck",  type: "boolean",               default: "false", description: "Enable spellcheck" },
  { option: "minlength",   type: "number",                default: "—",     description: "Minimum length" },
  { option: "maxlength",   type: "number",                default: "—",     description: "Maximum length" },
  { option: "pattern",     type: "string",                default: "—",     description: "Validation regex" },
  { option: "required",    type: "boolean",               default: "true",  description: "If true, empty string ≡ no value yet" },
  { option: "submit",      type: "boolean \\| string",     default: "false", description: "Only fire on Enter / blur" },
  { option: "datalist",    type: "iterable",              default: "—",     description: "Autocomplete suggestions" },
  { option: "disabled",    type: "boolean",               default: "false", description: "Disable the input" },
  { option: "readonly",    type: "boolean",               default: "false", description: "Read-only" }
], { layout: "auto", width: { description: 360 } })
)};
const _text_example = function _text_example(Inputs){return(
Inputs.text({ label: "name", placeholder: "Ada Lovelace" })
)};

const _textarea_docs = function _textarea_docs(md){return(
md`### \`Inputs.textarea(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/textarea)

A multi-line text input.
`
)};
const _textarea_options = function _textarea_options(Inputs){return(
Inputs.table([
  { option: "label",       type: "string \\| HTMLElement", default: "—",        description: "Form label" },
  { option: "value",       type: "string",                default: '""',        description: "Initial value" },
  { option: "placeholder", type: "string",                default: "—",        description: "Placeholder text" },
  { option: "rows",        type: "number",                default: "3",        description: "Visible rows" },
  { option: "cols",        type: "number",                default: "—",        description: "Visible columns" },
  { option: "resize",      type: 'bool \\| "h" \\| "v" \\| "both"', default: '"vertical"', description: "Resize handle behavior" },
  { option: "spellcheck",  type: "boolean",               default: "true",     description: "Enable spellcheck" },
  { option: "minlength",   type: "number",                default: "—",        description: "Minimum length" },
  { option: "maxlength",   type: "number",                default: "—",        description: "Maximum length" },
  { option: "required",    type: "boolean",               default: "true",     description: "If true, empty ≡ no value yet" },
  { option: "submit",      type: "boolean \\| string",     default: "false",    description: "Only fire on blur / Ctrl+Enter" },
  { option: "monospace",   type: "boolean",               default: "false",    description: "Use a monospace font" },
  { option: "disabled",    type: "boolean",               default: "false",    description: "Disable the input" },
  { option: "readonly",    type: "boolean",               default: "false",    description: "Read-only" }
], { layout: "auto", width: { description: 360 } })
)};
const _textarea_example = function _textarea_example(Inputs){return(
Inputs.textarea({ label: "bio", placeholder: "Tell us about yourself…", rows: 4 })
)};

const _color_docs = function _color_docs(md){return(
md`### \`Inputs.color(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/color)

A native color picker; value is a \`#rrggbb\` hex string.
`
)};
const _color_options = function _color_options(Inputs){return(
Inputs.table([
  { option: "label",    type: "string \\| HTMLElement", default: "—",        description: "Form label" },
  { option: "value",    type: "string (hex)",          default: '"#000000"', description: "Initial color" },
  { option: "datalist", type: "iterable of hex",       default: "—",        description: "Color suggestions" },
  { option: "required", type: "boolean",               default: "true",     description: "If true, must have a value" },
  { option: "disabled", type: "boolean",               default: "false",    description: "Disable the picker" }
], { layout: "auto", width: { description: 360 } })
)};
const _color_example = function _color_example(Inputs){return(
Inputs.color({ label: "accent", value: "#3b82f6" })
)};

const _date_docs = function _date_docs(md){return(
md`### \`Inputs.date(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/date)

A date picker; value is a Date at midnight UTC, or \`null\`.
`
)};
const _date_options = function _date_options(Inputs){return(
Inputs.table([
  { option: "label",    type: "string \\| HTMLElement",      default: "—",   description: "Form label" },
  { option: "value",    type: "Date \\| string \\| null",      default: "null", description: "Initial value" },
  { option: "min",      type: "Date \\| string",             default: "—",   description: "Earliest allowed date" },
  { option: "max",      type: "Date \\| string",             default: "—",   description: "Latest allowed date" },
  { option: "step",     type: "number",                     default: "—",   description: "Step in days" },
  { option: "required", type: "boolean",                    default: "true", description: "If true, blank is invalid" },
  { option: "disabled", type: "boolean",                    default: "false", description: "Disable the picker" },
  { option: "readonly", type: "boolean",                    default: "false", description: "Read-only" }
], { layout: "auto", width: { description: 360 } })
)};
const _date_example = function _date_example(Inputs){return(
Inputs.date({ label: "start", value: "2026-01-01" })
)};

const _datetime_docs = function _datetime_docs(md){return(
md`### \`Inputs.datetime(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/date)

A date + time picker; value is a Date in local time, or \`null\`.
`
)};
const _datetime_options = function _datetime_options(Inputs){return(
Inputs.table([
  { option: "label",    type: "string \\| HTMLElement",      default: "—",   description: "Form label" },
  { option: "value",    type: "Date \\| string \\| null",      default: "null", description: "Initial value" },
  { option: "min",      type: "Date \\| string",             default: "—",   description: "Earliest allowed datetime" },
  { option: "max",      type: "Date \\| string",             default: "—",   description: "Latest allowed datetime" },
  { option: "step",     type: "number",                     default: "—",   description: "Step in seconds" },
  { option: "required", type: "boolean",                    default: "true", description: "If true, blank is invalid" },
  { option: "disabled", type: "boolean",                    default: "false", description: "Disable the picker" },
  { option: "readonly", type: "boolean",                    default: "false", description: "Read-only" }
], { layout: "auto", width: { description: 360 } })
)};
const _datetime_example = function _datetime_example(Inputs){return(
Inputs.datetime({ label: "scheduled", value: "2026-06-15T09:30" })
)};

const _file_docs = function _file_docs(md){return(
md`### \`Inputs.file(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/file)

A file picker; value is a File augmented with \`text()\`, \`json()\`, \`csv()\`, \`image()\`, … (same API as FileAttachment).
`
)};
const _file_options = function _file_options(Inputs){return(
Inputs.table([
  { option: "label",     type: "string \\| HTMLElement", default: "—",   description: "Form label" },
  { option: "accept",    type: "string",                default: "—",   description: 'MIME types / extensions (e.g. ".csv,.tsv")' },
  { option: "capture",   type: "string",                default: "—",   description: '"environment" or "user" on mobile' },
  { option: "multiple",  type: "boolean",               default: "false", description: "Allow multiple files" },
  { option: "required",  type: "boolean",               default: "true", description: "If true, file is required" },
  { option: "disabled",  type: "boolean",               default: "false", description: "Disable the picker" },
  { option: "transform", type: "(file) => any",         default: "identity", description: "Post-process each selected file" }
], { layout: "auto", width: { description: 360 } })
)};
const _file_example = function _file_example(Inputs){return(
Inputs.file({ label: "upload", accept: ".csv,.tsv,.json,.txt" })
)};

const _search_data = function _search_data(){return(
[
  { city: "Zurich",     country: "CH", pop: 421878 },
  { city: "Geneva",     country: "CH", pop: 203951 },
  { city: "London",     country: "GB", pop: 8982000 },
  { city: "Manchester", country: "GB", pop: 552858 },
  { city: "New York",   country: "US", pop: 8336000 },
  { city: "Chicago",    country: "US", pop: 2693000 },
  { city: "Tokyo",      country: "JP", pop: 13929286 },
  { city: "Osaka",      country: "JP", pop: 2691000 }
]
)};
const _search_docs = function _search_docs(md){return(
md`### \`Inputs.search(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/search)

Filter an array with a free-text query.
`
)};
const _search_options = function _search_options(Inputs){return(
Inputs.table([
  { option: "label",        type: "string \\| HTMLElement",     default: "—",       description: "Form label" },
  { option: "query",        type: "string",                    default: '""',      description: "Initial query" },
  { option: "placeholder",  type: "string",                    default: '"Search"', description: "Placeholder" },
  { option: "columns",      type: "iterable",                  default: "—",       description: "Restrict search to these column names" },
  { option: "filter",       type: "(q) => (d) => boolean",     default: "—",       description: "Custom filter generator" },
  { option: "spellcheck",   type: "boolean",                   default: "false",   description: "Enable spellcheck" },
  { option: "autocomplete", type: "string",                    default: '"off"',   description: "HTML autocomplete attribute" },
  { option: "required",     type: "boolean",                   default: "true",    description: "If false, empty query → full data" },
  { option: "disabled",     type: "boolean",                   default: "false",   description: "Disable the input" }
], { layout: "auto", width: { description: 360 } })
)};
const _search_example = function _search_example(Inputs,search_data){return(
Inputs.search(search_data, { label: "cities" })
)};

const _table_docs = function _table_docs(md){return(
md`### \`Inputs.table(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/table)

Scrollable, sortable, selectable tabular view; also an input — its value is the selected rows.
`
)};
const _table_options = function _table_options(Inputs){return(
Inputs.table([
  { option: "columns",  type: "iterable",            default: "inferred", description: "Column names to show" },
  { option: "header",   type: "object",              default: "—",        description: "Map column → custom header content" },
  { option: "width",    type: "number \\| object",    default: "—",        description: "Total width, or per-column widths" },
  { option: "height",   type: "number",              default: "428",      description: "Max height before scrolling" },
  { option: "rows",     type: "number",              default: "11.5",     description: "Visible row count" },
  { option: "align",    type: "string \\| object",    default: "—",        description: "Per-column or global text alignment" },
  { option: "format",   type: "object",              default: "inferred", description: "Map column → cell formatter" },
  { option: "sort",     type: "string",              default: "—",        description: "Column to sort by" },
  { option: "reverse",  type: "boolean",             default: "false",    description: "Sort descending" },
  { option: "multiple", type: "boolean",             default: "true",     description: "Allow multi-row selection" },
  { option: "required", type: "boolean",             default: "true",     description: "Value is visible rows when none selected" },
  { option: "select",   type: "boolean",             default: "true",     description: "Show row-selection checkboxes" },
  { option: "layout",   type: '"fixed" \\| "auto"',   default: '"fixed"',  description: "Table layout algorithm" }
], { layout: "auto", width: { description: 360 } })
)};
const _table_example = function _table_example(Inputs,search_data){return(
Inputs.table(search_data, { sort: "pop", reverse: true })
)};

const _form_docs = function _form_docs(md){return(
md`### \`Inputs.form(inputs, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/form)

Compose several inputs into one object-valued input. \`inputs\` may be an array (value is an array of child values) or an object (value is an object with the same keys).
`
)};
const _form_options = function _form_options(Inputs){return(
Inputs.table([
  { option: "template", type: "(values, inputs) => HTMLElement", default: "stacked", description: "Custom layout function" }
], { layout: "auto", width: { description: 360 } })
)};
const _form_example = function _form_example(Inputs){return(
Inputs.form({
  name:   Inputs.text({ label: "name" }),
  age:    Inputs.number([0, 120], { label: "age", value: 30 }),
  active: Inputs.toggle({ label: "active", value: true })
})
)};

const _bind_docs = function _bind_docs(md){return(
md`### \`Inputs.bind(target, source, invalidation?)\` [[docs]](https://observablehq.com/@observablehq/inputs/bind)

Sync two inputs so they share a value. Returns \`target\`, so you can chain inside a render expression. Pass the Observable \`invalidation\` builtin to detach automatically.
`
)};
const _bind_slider = function _bind_slider(Inputs){return(
Inputs.range([0, 100], { label: "slider", value: 50, step: 1 })
)};
const _bind_number = function _bind_number(Inputs,$0,invalidation){return(
Inputs.bind(Inputs.number([0, 100], { label: "number" }), $0, invalidation)
)};

const _input_docs = function _input_docs(md){return(
md`### \`Inputs.input(value)\` [[docs]](https://github.com/observablehq/inputs/blob/main/src/input.js)

A bare EventTarget you mutate by hand — the low-level building block other inputs are built on. Set \`.value\` then dispatch an \`"input"\` event to notify reactive consumers.
`
)};
const _input_example = function _input_example(Inputs){return(
Inputs.input(0)
)};
const _input_bump = function _input_bump(Inputs,$0,Event){return(
Inputs.button("bump value", { reduce: () => {
  $0.value = ($0.value || 0) + 1;
  $0.dispatchEvent(new Event("input"));
} })
)};

const _utilities_docs = function _utilities_docs(md){return(
md`## Utilities

Non-widget exports of \`@observablehq/inputs\`:

- **\`searchFilter(query, options?)\`** — build a filter function over an array, matching the default \`Inputs.search\` behavior. Useful when you want the same filtering logic without the input itself.
- **\`disposal(element)\`** — returns a promise that resolves when \`element\` is removed from the DOM. Used by \`Inputs.bind\` and useful for any cleanup tied to an input's lifetime.
- **\`formatDate(date)\`** — ISO-like local date formatter.
- **\`formatLocaleAuto(locale?)\` / \`formatLocaleNumber(locale?)\`** — number/value formatters that respect a given locale.
- **\`formatTrim(value)\`** — trim trailing zeros from a number string.
- **\`formatAuto\` / \`formatNumber\`** — deprecated locale-blind variants; prefer \`formatLocaleAuto\` / \`formatLocaleNumber\`.
`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_intro_docs",    "intro_docs",    ["md"],            _intro_docs);
  $def("_contents_docs", "contents_docs", ["md", "linkTo"],  _contents_docs);

  $def("_button_docs",    "button_docs",    ["md"],     _button_docs);
  $def("_button_options", "button_options", ["Inputs"], _button_options);
  $def("_button_example", "viewof button_example", ["Inputs"], _button_example);
  main.variable(observer("button_example")).define("button_example", ["Generators", "viewof button_example"], (G, _) => G.input(_));

  $def("_checkbox_docs",    "checkbox_docs",    ["md"],     _checkbox_docs);
  $def("_checkbox_options", "checkbox_options", ["Inputs"], _checkbox_options);
  $def("_checkbox_example", "viewof checkbox_example", ["Inputs"], _checkbox_example);
  main.variable(observer("checkbox_example")).define("checkbox_example", ["Generators", "viewof checkbox_example"], (G, _) => G.input(_));

  $def("_radio_docs",    "radio_docs",    ["md"],     _radio_docs);
  $def("_radio_options", "radio_options", ["Inputs"], _radio_options);
  $def("_radio_example", "viewof radio_example", ["Inputs"], _radio_example);
  main.variable(observer("radio_example")).define("radio_example", ["Generators", "viewof radio_example"], (G, _) => G.input(_));

  $def("_toggle_docs",    "toggle_docs",    ["md"],     _toggle_docs);
  $def("_toggle_options", "toggle_options", ["Inputs"], _toggle_options);
  $def("_toggle_example", "viewof toggle_example", ["Inputs"], _toggle_example);
  main.variable(observer("toggle_example")).define("toggle_example", ["Generators", "viewof toggle_example"], (G, _) => G.input(_));

  $def("_select_docs",    "select_docs",    ["md"],     _select_docs);
  $def("_select_options", "select_options", ["Inputs"], _select_options);
  $def("_select_example", "viewof select_example", ["Inputs"], _select_example);
  main.variable(observer("select_example")).define("select_example", ["Generators", "viewof select_example"], (G, _) => G.input(_));

  $def("_range_docs",    "range_docs",    ["md"],     _range_docs);
  $def("_range_options", "range_options", ["Inputs"], _range_options);
  $def("_range_example", "viewof range_example", ["Inputs"], _range_example);
  main.variable(observer("range_example")).define("range_example", ["Generators", "viewof range_example"], (G, _) => G.input(_));

  $def("_number_docs",    "number_docs",    ["md"],     _number_docs);
  $def("_number_options", "number_options", ["Inputs"], _number_options);
  $def("_number_example", "viewof number_example", ["Inputs"], _number_example);
  main.variable(observer("number_example")).define("number_example", ["Generators", "viewof number_example"], (G, _) => G.input(_));

  $def("_text_docs",    "text_docs",    ["md"],     _text_docs);
  $def("_text_options", "text_options", ["Inputs"], _text_options);
  $def("_text_example", "viewof text_example", ["Inputs"], _text_example);
  main.variable(observer("text_example")).define("text_example", ["Generators", "viewof text_example"], (G, _) => G.input(_));

  $def("_textarea_docs",    "textarea_docs",    ["md"],     _textarea_docs);
  $def("_textarea_options", "textarea_options", ["Inputs"], _textarea_options);
  $def("_textarea_example", "viewof textarea_example", ["Inputs"], _textarea_example);
  main.variable(observer("textarea_example")).define("textarea_example", ["Generators", "viewof textarea_example"], (G, _) => G.input(_));

  $def("_color_docs",    "color_docs",    ["md"],     _color_docs);
  $def("_color_options", "color_options", ["Inputs"], _color_options);
  $def("_color_example", "viewof color_example", ["Inputs"], _color_example);
  main.variable(observer("color_example")).define("color_example", ["Generators", "viewof color_example"], (G, _) => G.input(_));

  $def("_date_docs",    "date_docs",    ["md"],     _date_docs);
  $def("_date_options", "date_options", ["Inputs"], _date_options);
  $def("_date_example", "viewof date_example", ["Inputs"], _date_example);
  main.variable(observer("date_example")).define("date_example", ["Generators", "viewof date_example"], (G, _) => G.input(_));

  $def("_datetime_docs",    "datetime_docs",    ["md"],     _datetime_docs);
  $def("_datetime_options", "datetime_options", ["Inputs"], _datetime_options);
  $def("_datetime_example", "viewof datetime_example", ["Inputs"], _datetime_example);
  main.variable(observer("datetime_example")).define("datetime_example", ["Generators", "viewof datetime_example"], (G, _) => G.input(_));

  $def("_file_docs",    "file_docs",    ["md"],     _file_docs);
  $def("_file_options", "file_options", ["Inputs"], _file_options);
  $def("_file_example", "viewof file_example", ["Inputs"], _file_example);
  main.variable(observer("file_example")).define("file_example", ["Generators", "viewof file_example"], (G, _) => G.input(_));

  $def("_search_data",    "search_data", [],                       _search_data);
  $def("_search_docs",    "search_docs", ["md"],                   _search_docs);
  $def("_search_options", "search_options", ["Inputs"],            _search_options);
  $def("_search_example", "viewof search_example", ["Inputs", "search_data"], _search_example);
  main.variable(observer("search_example")).define("search_example", ["Generators", "viewof search_example"], (G, _) => G.input(_));

  $def("_table_docs",    "table_docs",    ["md"],     _table_docs);
  $def("_table_options", "table_options", ["Inputs"], _table_options);
  $def("_table_example", "viewof table_example", ["Inputs", "search_data"], _table_example);
  main.variable(observer("table_example")).define("table_example", ["Generators", "viewof table_example"], (G, _) => G.input(_));

  $def("_form_docs",    "form_docs",    ["md"],     _form_docs);
  $def("_form_options", "form_options", ["Inputs"], _form_options);
  $def("_form_example", "viewof form_example", ["Inputs"], _form_example);
  main.variable(observer("form_example")).define("form_example", ["Generators", "viewof form_example"], (G, _) => G.input(_));

  $def("_bind_docs",   "bind_docs",   ["md"],     _bind_docs);
  $def("_bind_slider", "viewof bind_slider", ["Inputs"], _bind_slider);
  main.variable(observer("bind_slider")).define("bind_slider", ["Generators", "viewof bind_slider"], (G, _) => G.input(_));
  $def("_bind_number", "viewof bind_number", ["Inputs", "viewof bind_slider", "invalidation"], _bind_number);
  main.variable(observer("bind_number")).define("bind_number", ["Generators", "viewof bind_number"], (G, _) => G.input(_));

  $def("_input_docs",    "input_docs",    ["md"], _input_docs);
  $def("_input_example", "viewof input_example", ["Inputs"], _input_example);
  main.variable(observer("input_example")).define("input_example", ["Generators", "viewof input_example"], (G, _) => G.input(_));
  $def("_input_bump",    "viewof input_bump", ["Inputs", "viewof input_example", "Event"], _input_bump);
  main.variable(observer("input_bump")).define("input_bump", ["Generators", "viewof input_bump"], (G, _) => G.input(_));

  $def("_utilities_docs", "utilities_docs", ["md"], _utilities_docs);

  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));

  return main;
}
