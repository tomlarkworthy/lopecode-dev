const _idlcsc = function _intro_docs(md){return(
md`# Observable Inputs Reference

A live reference for every widget in [@observablehq/inputs](https://github.com/observablehq/inputs) — see the [official docs](https://observablehq.com/@observablehq/inputs).
`
)};
const _111coap = function _contents_docs(md,linkTo){return(
md`## Contents

**Choice** &nbsp; [\`radio\`](${ linkTo('@tomlarkworthy/inputs-reference#radio_docs', { onObservable: false }) }) · [\`checkbox\`](${ linkTo('@tomlarkworthy/inputs-reference#checkbox_docs', { onObservable: false }) }) · [\`toggle\`](${ linkTo('@tomlarkworthy/inputs-reference#toggle_docs', { onObservable: false }) }) · [\`select\`](${ linkTo('@tomlarkworthy/inputs-reference#select_docs', { onObservable: false }) })

**Numeric** &nbsp; [\`range\`](${ linkTo('@tomlarkworthy/inputs-reference#range_docs', { onObservable: false }) }) · [\`number\`](${ linkTo('@tomlarkworthy/inputs-reference#number_docs', { onObservable: false }) })

**Text** &nbsp; [\`text\`](${ linkTo('@tomlarkworthy/inputs-reference#text_docs', { onObservable: false }) }) · [\`textarea\`](${ linkTo('@tomlarkworthy/inputs-reference#textarea_docs', { onObservable: false }) }) · [\`search\`](${ linkTo('@tomlarkworthy/inputs-reference#search_docs', { onObservable: false }) })

**Date** &nbsp; [\`date\`](${ linkTo('@tomlarkworthy/inputs-reference#date_docs', { onObservable: false }) }) · [\`datetime\`](${ linkTo('@tomlarkworthy/inputs-reference#datetime_docs', { onObservable: false }) })

**Other** &nbsp; [\`color\`](${ linkTo('@tomlarkworthy/inputs-reference#color_docs', { onObservable: false }) }) · [\`file\`](${ linkTo('@tomlarkworthy/inputs-reference#file_docs', { onObservable: false }) }) · [\`button\`](${ linkTo('@tomlarkworthy/inputs-reference#button_docs', { onObservable: false }) })

**Composition** &nbsp; [\`form\`](${ linkTo('@tomlarkworthy/inputs-reference#form_docs', { onObservable: false }) }) · [\`bind\`](${ linkTo('@tomlarkworthy/inputs-reference#bind_docs', { onObservable: false }) }) · [\`table\`](${ linkTo('@tomlarkworthy/inputs-reference#table_docs', { onObservable: false }) }) · [\`input\`](${ linkTo('@tomlarkworthy/inputs-reference#input_docs', { onObservable: false }) }) · [utilities](${ linkTo('@tomlarkworthy/inputs-reference#utilities_docs', { onObservable: false }) })
`
)};
const _6zoemg = function _button_docs(md){return(
md`### \`Inputs.button(content, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/button)

A clickable button.
`
)};
const _1807eyd = function _button_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'any',
        default: '0',
        description: 'Initial value'
    },
    {
        option: 'reduce',
        type: '(value) => any',
        default: 'v => (v||0)+1',
        description: 'Applied on each click to derive the next value'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If false, value may be undefined before first click'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the button'
    },
    {
        option: 'width',
        type: 'number',
        default: '\u2014',
        description: 'Container width in pixels'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _11fq99i = function _button_example(Inputs){return(
Inputs.button([
    [
        '\u2212',
        v => v - 1
    ],
    [
        'reset',
        () => 0
    ],
    [
        '+',
        v => v + 1
    ]
], {
    label: 'counter',
    value: 0
})
)};
const _k0tx2l = (G, _) => G.input(_);
const _1dtfmpz = function _checkbox_docs(md){return(
md`### \`Inputs.checkbox(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/checkbox)

Zero or more values from a set.
`
)};
const _11ey9pv = function _checkbox_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'array',
        default: '[]',
        description: 'Initially-selected items'
    },
    {
        option: 'format',
        type: '(d) => string | HTMLElement',
        default: 'identity',
        description: 'Render each option'
    },
    {
        option: 'keyof',
        type: '(d) => any',
        default: 'identity',
        description: 'Identity for grouping / uniqueness'
    },
    {
        option: 'valueof',
        type: '(d) => any',
        default: 'identity',
        description: 'Map selected items to a different value'
    },
    {
        option: 'sort',
        type: 'bool | "asc" | "desc" | fn',
        default: 'false',
        description: 'Sort options'
    },
    {
        option: 'unique',
        type: 'boolean',
        default: 'false',
        description: 'De-duplicate options'
    },
    {
        option: 'disabled',
        type: 'boolean | array',
        default: 'false',
        description: 'Disable all, or by item'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _191ryf7 = function _checkbox_example(Inputs){return(
Inputs.checkbox([
    'apple',
    'banana',
    'cherry',
    'durian',
    'elderberry'
], {
    label: 'fruit',
    value: ['banana']
})
)};
const _8tlhio = (G, _) => G.input(_);
const _nzx14u = function _radio_docs(md){return(
md`### \`Inputs.radio(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/radio)

Exactly one value from a set.
`
)};
const _1874ufo = function _radio_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'any',
        default: 'null',
        description: 'Initially-selected item'
    },
    {
        option: 'format',
        type: '(d) => string | HTMLElement',
        default: 'identity',
        description: 'Render each option'
    },
    {
        option: 'keyof',
        type: '(d) => any',
        default: 'identity',
        description: 'Identity for grouping'
    },
    {
        option: 'valueof',
        type: '(d) => any',
        default: 'identity',
        description: 'Map selection to a different value'
    },
    {
        option: 'sort',
        type: 'bool | "asc" | "desc" | fn',
        default: 'false',
        description: 'Sort options'
    },
    {
        option: 'unique',
        type: 'boolean',
        default: 'false',
        description: 'De-duplicate options'
    },
    {
        option: 'disabled',
        type: 'boolean | array',
        default: 'false',
        description: 'Disable all, or by item'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _1po4cbx = function _radio_example(Inputs){return(
Inputs.radio([
    'S',
    'M',
    'L',
    'XL'
], {
    label: 'size',
    value: 'M'
})
)};
const _hy5f9o = (G, _) => G.input(_);
const _1whc8kn = function _toggle_docs(md){return(
md`### \`Inputs.toggle(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/toggle)

A single boolean switch.
`
)};
const _1dvs93w = function _toggle_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'boolean',
        default: 'false',
        description: 'Initial value'
    },
    {
        option: 'values',
        type: '[falsey, truthy]',
        default: '[false, true]',
        description: 'Values returned for off / on'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the toggle'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _1b5ffsc = function _toggle_example(Inputs){return(
Inputs.toggle({
    label: 'active',
    value: true
})
)};
const _1ybbvzl = (G, _) => G.input(_);
const _ployy = function _select_docs(md){return(
md`### \`Inputs.select(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/select)

One (or many) values from a list, as a dropdown.
`
)};
const _15hahgn = function _select_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'any | array',
        default: 'first',
        description: 'Initial selection'
    },
    {
        option: 'multiple',
        type: 'boolean | number',
        default: 'false',
        description: 'Multi-select; size = number if number'
    },
    {
        option: 'size',
        type: 'number',
        default: '\u2014',
        description: 'Visible row count if multiple'
    },
    {
        option: 'format',
        type: '(d) => string',
        default: 'identity',
        description: 'Render each option'
    },
    {
        option: 'keyof',
        type: '(d) => any',
        default: 'identity',
        description: 'Identity for grouping'
    },
    {
        option: 'valueof',
        type: '(d) => any',
        default: 'identity',
        description: 'Map selection to a different value'
    },
    {
        option: 'sort',
        type: 'bool | "asc" | "desc" | fn',
        default: 'false',
        description: 'Sort options'
    },
    {
        option: 'unique',
        type: 'boolean',
        default: 'false',
        description: 'De-duplicate options'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If false, a blank entry is added'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the select'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _5qzwna = function _select_example(Inputs){return(
Inputs.select(new Map([
    [
        'Switzerland',
        'CH'
    ],
    [
        'United Kingdom',
        'GB'
    ],
    [
        'United States',
        'US'
    ],
    [
        'Japan',
        'JP'
    ]
]), {
    label: 'country',
    value: 'GB'
})
)};
const _o4k049 = (G, _) => G.input(_);
const _1ys545j = function _range_docs(md){return(
md`### \`Inputs.range([min, max], options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/range)

A numeric slider with paired text input.
`
)};
const _79ekdd = function _range_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'number',
        default: 'midpoint',
        description: 'Initial value'
    },
    {
        option: 'step',
        type: 'number',
        default: '(max\u2212min)/100',
        description: 'Step size; pass 1 for integers'
    },
    {
        option: 'transform',
        type: '(v) => v',
        default: 'identity',
        description: 'Map slider position \u2192 value (e.g. Math.log)'
    },
    {
        option: 'invert',
        type: '(v) => v',
        default: 'inverse',
        description: 'Map value \u2192 slider position'
    },
    {
        option: 'format',
        type: '(v) => string',
        default: 'identity',
        description: 'Format for the text input'
    },
    {
        option: 'placeholder',
        type: 'string',
        default: '\u2014',
        description: 'Placeholder text'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If false, value may be NaN'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the slider'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _ju7o2n = function _range_example(Inputs){return(
Inputs.range([
    0,
    100
], {
    label: 'volume',
    value: 42,
    step: 1
})
)};
const _ha2kcq = (G, _) => G.input(_);
const _di3uax = function _number_docs(md){return(
md`### \`Inputs.number([min, max]?, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/range)

A numeric input without a slider.
`
)};
const _qz18bj = function _number_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'number',
        default: 'NaN',
        description: 'Initial value'
    },
    {
        option: 'step',
        type: 'number',
        default: '\u2014',
        description: 'Increment for arrows / spinner'
    },
    {
        option: 'placeholder',
        type: 'string',
        default: '\u2014',
        description: 'Placeholder text'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If false, blank \u2192 NaN'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the input'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _1pcfi9o = function _number_example(Inputs){return(
Inputs.number([
    0,
    10000
], {
    label: 'price',
    value: 99,
    step: 0.01
})
)};
const _1ejsxp4 = (G, _) => G.input(_);
const _1hx3s4h = function _text_docs(md){return(
md`### \`Inputs.text(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/text)

A single-line text input. Variants: \`Inputs.email\`, \`Inputs.tel\`, \`Inputs.url\`, \`Inputs.password\` (same options, with \`type\` pre-set).
`
)};
const _1301uwk = function _text_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'string',
        default: '""',
        description: 'Initial value'
    },
    {
        option: 'placeholder',
        type: 'string',
        default: '\u2014',
        description: 'Placeholder text'
    },
    {
        option: 'type',
        type: 'string',
        default: '"text"',
        description: 'HTML input type (text, email, url, password, tel, \u2026)'
    },
    {
        option: 'spellcheck',
        type: 'boolean',
        default: 'false',
        description: 'Enable spellcheck'
    },
    {
        option: 'minlength',
        type: 'number',
        default: '\u2014',
        description: 'Minimum length'
    },
    {
        option: 'maxlength',
        type: 'number',
        default: '\u2014',
        description: 'Maximum length'
    },
    {
        option: 'pattern',
        type: 'string',
        default: '\u2014',
        description: 'Validation regex'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If true, empty string \u2261 no value yet'
    },
    {
        option: 'submit',
        type: 'boolean | string',
        default: 'false',
        description: 'Only fire on Enter / blur'
    },
    {
        option: 'datalist',
        type: 'iterable',
        default: '\u2014',
        description: 'Autocomplete suggestions'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the input'
    },
    {
        option: 'readonly',
        type: 'boolean',
        default: 'false',
        description: 'Read-only'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _hxygnr = function _text_example(Inputs){return(
Inputs.text({
    label: 'name',
    placeholder: 'Ada Lovelace'
})
)};
const _90ekeu = (G, _) => G.input(_);
const _ral4pu = function _textarea_docs(md){return(
md`### \`Inputs.textarea(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/textarea)

A multi-line text input.
`
)};
const _6etc51 = function _textarea_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'string',
        default: '""',
        description: 'Initial value'
    },
    {
        option: 'placeholder',
        type: 'string',
        default: '\u2014',
        description: 'Placeholder text'
    },
    {
        option: 'rows',
        type: 'number',
        default: '3',
        description: 'Visible rows'
    },
    {
        option: 'cols',
        type: 'number',
        default: '\u2014',
        description: 'Visible columns'
    },
    {
        option: 'resize',
        type: 'bool | "h" | "v" | "both"',
        default: '"vertical"',
        description: 'Resize handle behavior'
    },
    {
        option: 'spellcheck',
        type: 'boolean',
        default: 'true',
        description: 'Enable spellcheck'
    },
    {
        option: 'minlength',
        type: 'number',
        default: '\u2014',
        description: 'Minimum length'
    },
    {
        option: 'maxlength',
        type: 'number',
        default: '\u2014',
        description: 'Maximum length'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If true, empty \u2261 no value yet'
    },
    {
        option: 'submit',
        type: 'boolean | string',
        default: 'false',
        description: 'Only fire on blur / Ctrl+Enter'
    },
    {
        option: 'monospace',
        type: 'boolean',
        default: 'false',
        description: 'Use a monospace font'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the input'
    },
    {
        option: 'readonly',
        type: 'boolean',
        default: 'false',
        description: 'Read-only'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _1wbm5bf = function _textarea_example(Inputs){return(
Inputs.textarea({
    label: 'bio',
    placeholder: 'Tell us about yourself\u2026',
    rows: 4
})
)};
const _1f12itj = (G, _) => G.input(_);
const _1tovcpr = function _color_docs(md){return(
md`### \`Inputs.color(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/color)

A native color picker; value is a \`#rrggbb\` hex string.
`
)};
const _2ppt2a = function _color_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'string (hex)',
        default: '"#000000"',
        description: 'Initial color'
    },
    {
        option: 'datalist',
        type: 'iterable of hex',
        default: '\u2014',
        description: 'Color suggestions'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If true, must have a value'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the picker'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _1e0du0z = function _color_example(Inputs){return(
Inputs.color({
    label: 'accent',
    value: '#3b82f6'
})
)};
const _prkipc = (G, _) => G.input(_);
const _gfo7k7 = function _date_docs(md){return(
md`### \`Inputs.date(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/date)

A date picker; value is a Date at midnight UTC, or \`null\`.
`
)};
const _196al3w = function _date_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'Date | string | null',
        default: 'null',
        description: 'Initial value'
    },
    {
        option: 'min',
        type: 'Date | string',
        default: '\u2014',
        description: 'Earliest allowed date'
    },
    {
        option: 'max',
        type: 'Date | string',
        default: '\u2014',
        description: 'Latest allowed date'
    },
    {
        option: 'step',
        type: 'number',
        default: '\u2014',
        description: 'Step in days'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If true, blank is invalid'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the picker'
    },
    {
        option: 'readonly',
        type: 'boolean',
        default: 'false',
        description: 'Read-only'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _guahra = function _date_example(Inputs){return(
Inputs.date({
    label: 'start',
    value: '2026-01-01'
})
)};
const _w2mfkl = (G, _) => G.input(_);
const _dy82cy = function _datetime_docs(md){return(
md`### \`Inputs.datetime(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/date)

A date + time picker; value is a Date in local time, or \`null\`.
`
)};
const _mioxw0 = function _datetime_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'value',
        type: 'Date | string | null',
        default: 'null',
        description: 'Initial value'
    },
    {
        option: 'min',
        type: 'Date | string',
        default: '\u2014',
        description: 'Earliest allowed datetime'
    },
    {
        option: 'max',
        type: 'Date | string',
        default: '\u2014',
        description: 'Latest allowed datetime'
    },
    {
        option: 'step',
        type: 'number',
        default: '\u2014',
        description: 'Step in seconds'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If true, blank is invalid'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the picker'
    },
    {
        option: 'readonly',
        type: 'boolean',
        default: 'false',
        description: 'Read-only'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _1bhpy9y = function _datetime_example(Inputs){return(
Inputs.datetime({
    label: 'scheduled',
    value: '2026-06-15T09:30'
})
)};
const _1b6cn48 = (G, _) => G.input(_);
const _tf7ze0 = function _file_docs(md){return(
md`### \`Inputs.file(options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/file)

A file picker; value is a File augmented with \`text()\`, \`json()\`, \`csv()\`, \`image()\`, … (same API as FileAttachment).
`
)};
const _16fypa3 = function _file_options(Inputs){return(
Inputs.table([
    {
        option: 'label',
        type: 'string | HTMLElement',
        default: '\u2014',
        description: 'Form label'
    },
    {
        option: 'accept',
        type: 'string',
        default: '\u2014',
        description: 'MIME types / extensions (e.g. ".csv,.tsv")'
    },
    {
        option: 'capture',
        type: 'string',
        default: '\u2014',
        description: '"environment" or "user" on mobile'
    },
    {
        option: 'multiple',
        type: 'boolean',
        default: 'false',
        description: 'Allow multiple files'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'If true, file is required'
    },
    {
        option: 'disabled',
        type: 'boolean',
        default: 'false',
        description: 'Disable the picker'
    },
    {
        option: 'transform',
        type: '(file) => any',
        default: 'identity',
        description: 'Post-process each selected file'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _10qr47l = function _file_example(Inputs){return(
Inputs.file({
    label: 'upload',
    accept: '.csv,.tsv,.json,.txt'
})
)};
const _1iawbhr = (G, _) => G.input(_);
const _44yks7 = function _search_data(){return(
[
    {
        city: 'Zurich',
        country: 'CH',
        pop: 421878
    },
    {
        city: 'Geneva',
        country: 'CH',
        pop: 203951
    },
    {
        city: 'London',
        country: 'GB',
        pop: 8982000
    },
    {
        city: 'Manchester',
        country: 'GB',
        pop: 552858
    },
    {
        city: 'New York',
        country: 'US',
        pop: 8336000
    },
    {
        city: 'Chicago',
        country: 'US',
        pop: 2693000
    },
    {
        city: 'Tokyo',
        country: 'JP',
        pop: 13929286
    },
    {
        city: 'Osaka',
        country: 'JP',
        pop: 2691000
    }
]
)};
const _behnw5 = function _search_docs(md){return(
md`### \`Inputs.search(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/search)

Filter an array with a free-text query.
`
)};
const _1xde7vk = function _search_options(Inputs){return(
Inputs.table(
  [
    {
      option: "label",
      type: "string | HTMLElement",
      default: "\u2014",
      description: "Form label"
    },
    {
      option: "query",
      type: "string",
      default: '""',
      description: "Initial query"
    },
    {
      option: "placeholder",
      type: "string",
      default: '"Search"',
      description: "Placeholder"
    },
    {
      option: "columns",
      type: "iterable",
      default: "\u2014",
      description: "Restrict search to these column names"
    },
    {
      option: "filter",
      type: "(q) => (d) => boolean",
      default: "\u2014",
      description: "Custom filter generator"
    },
    {
      option: "spellcheck",
      type: "boolean",
      default: "false",
      description: "Enable spellcheck"
    },
    {
      option: "autocomplete",
      type: "string",
      default: '"off"',
      description: "HTML autocomplete attribute"
    },
    {
      option: "required",
      type: "boolean",
      default: "true",
      description: "If false, empty query \u2192 full data"
    },
    {
      option: "disabled",
      type: "boolean",
      default: "false",
      description: "Disable the input"
    }
  ],
  {
    layout: "auto",
    width: { description: 360 }
  }
)
)};
const _1bv2fi = function _search_example(Inputs,search_data){return(
Inputs.search(search_data, { label: 'cities' })
)};
const _ov4yt = (G, _) => G.input(_);
const _1v03z4w = function _table_docs(md){return(
md`### \`Inputs.table(data, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/table)

Scrollable, sortable, selectable tabular view; also an input — its value is the selected rows.
`
)};
const _155lxor = function _table_options(Inputs){return(
Inputs.table([
    {
        option: 'columns',
        type: 'iterable',
        default: 'inferred',
        description: 'Column names to show'
    },
    {
        option: 'header',
        type: 'object',
        default: '\u2014',
        description: 'Map column \u2192 custom header content'
    },
    {
        option: 'width',
        type: 'number | object',
        default: '\u2014',
        description: 'Total width, or per-column widths'
    },
    {
        option: 'height',
        type: 'number',
        default: '428',
        description: 'Max height before scrolling'
    },
    {
        option: 'rows',
        type: 'number',
        default: '11.5',
        description: 'Visible row count'
    },
    {
        option: 'align',
        type: 'string | object',
        default: '\u2014',
        description: 'Per-column or global text alignment'
    },
    {
        option: 'format',
        type: 'object',
        default: 'inferred',
        description: 'Map column \u2192 cell formatter'
    },
    {
        option: 'sort',
        type: 'string',
        default: '\u2014',
        description: 'Column to sort by'
    },
    {
        option: 'reverse',
        type: 'boolean',
        default: 'false',
        description: 'Sort descending'
    },
    {
        option: 'multiple',
        type: 'boolean',
        default: 'true',
        description: 'Allow multi-row selection'
    },
    {
        option: 'required',
        type: 'boolean',
        default: 'true',
        description: 'Value is visible rows when none selected'
    },
    {
        option: 'select',
        type: 'boolean',
        default: 'true',
        description: 'Show row-selection checkboxes'
    },
    {
        option: 'layout',
        type: '"fixed" | "auto"',
        default: '"fixed"',
        description: 'Table layout algorithm'
    }
], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _5fnjc6 = function _table_example(Inputs,search_data){return(
Inputs.table(search_data, {
    sort: 'pop',
    reverse: true
})
)};
const _1b9kywb = (G, _) => G.input(_);
const _1nr7fnr = function _form_docs(md){return(
md`### \`Inputs.form(inputs, options?)\` [[docs]](https://observablehq.com/@observablehq/inputs/form)

Compose several inputs into one object-valued input. \`inputs\` may be an array (value is an array of child values) or an object (value is an object with the same keys).
`
)};
const _jjfgdl = function _form_options(Inputs){return(
Inputs.table([{
        option: 'template',
        type: '(values, inputs) => HTMLElement',
        default: 'stacked',
        description: 'Custom layout function'
    }], {
    layout: 'auto',
    width: { description: 360 }
})
)};
const _1t1ddih = function _form_example(Inputs){return(
Inputs.form({
    name: Inputs.text({ label: 'name' }),
    age: Inputs.number([
        0,
        120
    ], {
        label: 'age',
        value: 30
    }),
    active: Inputs.toggle({
        label: 'active',
        value: true
    })
})
)};
const _kaa377 = (G, _) => G.input(_);
const _w3ftb = function _bind_docs(md){return(
md`### \`Inputs.bind(target, source, invalidation?)\` [[docs]](https://observablehq.com/@observablehq/inputs/bind)

Sync two inputs so they share a value. Returns \`target\`, so you can chain inside a render expression. Pass the Observable \`invalidation\` builtin to detach automatically.
`
)};
const _1rju6fx = function _bind_slider(Inputs){return(
Inputs.range([
    0,
    100
], {
    label: 'slider',
    value: 50,
    step: 1
})
)};
const _e4mid3 = (G, _) => G.input(_);
const _qtkhmf = function _bind_number(Inputs,$0,invalidation){return(
Inputs.bind(Inputs.number([
    0,
    100
], { label: 'number' }), $0, invalidation)
)};
const _nh0syv = (G, _) => G.input(_);
const _k8n7zc = function _input_docs(md){return(
md`### \`Inputs.input(value)\` [[docs]](https://github.com/observablehq/inputs/blob/main/src/input.js)

A bare EventTarget you mutate by hand — the low-level building block other inputs are built on. Set \`.value\` then dispatch an \`"input"\` event to notify reactive consumers.
`
)};
const _x9dq3h = function _input_example(Inputs){return(
Inputs.input(0)
)};
const _2p8pxj = (G, _) => G.input(_);
const _diux3q = function _input_bump(Inputs,$0,Event){return(
Inputs.button('bump value', {
    reduce: () => {
        $0.value = ($0.value || 0) + 1;
        $0.dispatchEvent(new Event('input'));
    }
})
)};
const _13tc5t = (G, _) => G.input(_);
const _1v3u7s1 = function _utilities_docs(md){return(
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

  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  $def("_idlcsc", "intro_docs", ["md"], _idlcsc);  
  $def("_111coap", "contents_docs", ["md","linkTo"], _111coap);  
  $def("_6zoemg", "button_docs", ["md"], _6zoemg);  
  $def("_1807eyd", "button_options", ["Inputs"], _1807eyd);  
  $def("_11fq99i", "viewof button_example", ["Inputs"], _11fq99i);  
  $def("_k0tx2l", "button_example", ["Generators","viewof button_example"], _k0tx2l);  
  $def("_1dtfmpz", "checkbox_docs", ["md"], _1dtfmpz);  
  $def("_11ey9pv", "checkbox_options", ["Inputs"], _11ey9pv);  
  $def("_191ryf7", "viewof checkbox_example", ["Inputs"], _191ryf7);  
  $def("_8tlhio", "checkbox_example", ["Generators","viewof checkbox_example"], _8tlhio);  
  $def("_nzx14u", "radio_docs", ["md"], _nzx14u);  
  $def("_1874ufo", "radio_options", ["Inputs"], _1874ufo);  
  $def("_1po4cbx", "viewof radio_example", ["Inputs"], _1po4cbx);  
  $def("_hy5f9o", "radio_example", ["Generators","viewof radio_example"], _hy5f9o);  
  $def("_1whc8kn", "toggle_docs", ["md"], _1whc8kn);  
  $def("_1dvs93w", "toggle_options", ["Inputs"], _1dvs93w);  
  $def("_1b5ffsc", "viewof toggle_example", ["Inputs"], _1b5ffsc);  
  $def("_1ybbvzl", "toggle_example", ["Generators","viewof toggle_example"], _1ybbvzl);  
  $def("_ployy", "select_docs", ["md"], _ployy);  
  $def("_15hahgn", "select_options", ["Inputs"], _15hahgn);  
  $def("_5qzwna", "viewof select_example", ["Inputs"], _5qzwna);  
  $def("_o4k049", "select_example", ["Generators","viewof select_example"], _o4k049);  
  $def("_1ys545j", "range_docs", ["md"], _1ys545j);  
  $def("_79ekdd", "range_options", ["Inputs"], _79ekdd);  
  $def("_ju7o2n", "viewof range_example", ["Inputs"], _ju7o2n);  
  $def("_ha2kcq", "range_example", ["Generators","viewof range_example"], _ha2kcq);  
  $def("_di3uax", "number_docs", ["md"], _di3uax);  
  $def("_qz18bj", "number_options", ["Inputs"], _qz18bj);  
  $def("_1pcfi9o", "viewof number_example", ["Inputs"], _1pcfi9o);  
  $def("_1ejsxp4", "number_example", ["Generators","viewof number_example"], _1ejsxp4);  
  $def("_1hx3s4h", "text_docs", ["md"], _1hx3s4h);  
  $def("_1301uwk", "text_options", ["Inputs"], _1301uwk);  
  $def("_hxygnr", "viewof text_example", ["Inputs"], _hxygnr);  
  $def("_90ekeu", "text_example", ["Generators","viewof text_example"], _90ekeu);  
  $def("_ral4pu", "textarea_docs", ["md"], _ral4pu);  
  $def("_6etc51", "textarea_options", ["Inputs"], _6etc51);  
  $def("_1wbm5bf", "viewof textarea_example", ["Inputs"], _1wbm5bf);  
  $def("_1f12itj", "textarea_example", ["Generators","viewof textarea_example"], _1f12itj);  
  $def("_1tovcpr", "color_docs", ["md"], _1tovcpr);  
  $def("_2ppt2a", "color_options", ["Inputs"], _2ppt2a);  
  $def("_1e0du0z", "viewof color_example", ["Inputs"], _1e0du0z);  
  $def("_prkipc", "color_example", ["Generators","viewof color_example"], _prkipc);  
  $def("_gfo7k7", "date_docs", ["md"], _gfo7k7);  
  $def("_196al3w", "date_options", ["Inputs"], _196al3w);  
  $def("_guahra", "viewof date_example", ["Inputs"], _guahra);  
  $def("_w2mfkl", "date_example", ["Generators","viewof date_example"], _w2mfkl);  
  $def("_dy82cy", "datetime_docs", ["md"], _dy82cy);  
  $def("_mioxw0", "datetime_options", ["Inputs"], _mioxw0);  
  $def("_1bhpy9y", "viewof datetime_example", ["Inputs"], _1bhpy9y);  
  $def("_1b6cn48", "datetime_example", ["Generators","viewof datetime_example"], _1b6cn48);  
  $def("_tf7ze0", "file_docs", ["md"], _tf7ze0);  
  $def("_16fypa3", "file_options", ["Inputs"], _16fypa3);  
  $def("_10qr47l", "viewof file_example", ["Inputs"], _10qr47l);  
  $def("_1iawbhr", "file_example", ["Generators","viewof file_example"], _1iawbhr);  
  $def("_44yks7", "search_data", [], _44yks7);  
  $def("_behnw5", "search_docs", ["md"], _behnw5);  
  $def("_1xde7vk", "search_options", ["Inputs"], _1xde7vk);  
  $def("_1bv2fi", "viewof search_example", ["Inputs","search_data"], _1bv2fi);  
  $def("_ov4yt", "search_example", ["Generators","viewof search_example"], _ov4yt);  
  $def("_1v03z4w", "table_docs", ["md"], _1v03z4w);  
  $def("_155lxor", "table_options", ["Inputs"], _155lxor);  
  $def("_5fnjc6", "viewof table_example", ["Inputs","search_data"], _5fnjc6);  
  $def("_1b9kywb", "table_example", ["Generators","viewof table_example"], _1b9kywb);  
  $def("_1nr7fnr", "form_docs", ["md"], _1nr7fnr);  
  $def("_jjfgdl", "form_options", ["Inputs"], _jjfgdl);  
  $def("_1t1ddih", "viewof form_example", ["Inputs"], _1t1ddih);  
  $def("_kaa377", "form_example", ["Generators","viewof form_example"], _kaa377);  
  $def("_w3ftb", "bind_docs", ["md"], _w3ftb);  
  $def("_1rju6fx", "viewof bind_slider", ["Inputs"], _1rju6fx);  
  $def("_e4mid3", "bind_slider", ["Generators","viewof bind_slider"], _e4mid3);  
  $def("_qtkhmf", "viewof bind_number", ["Inputs","viewof bind_slider","invalidation"], _qtkhmf);  
  $def("_nh0syv", "bind_number", ["Generators","viewof bind_number"], _nh0syv);  
  $def("_k8n7zc", "input_docs", ["md"], _k8n7zc);  
  $def("_x9dq3h", "viewof input_example", ["Inputs"], _x9dq3h);  
  $def("_2p8pxj", "input_example", ["Generators","viewof input_example"], _2p8pxj);  
  $def("_diux3q", "viewof input_bump", ["Inputs","viewof input_example","Event"], _diux3q);  
  $def("_13tc5t", "input_bump", ["Generators","viewof input_bump"], _13tc5t);  
  $def("_1v3u7s1", "utilities_docs", ["md"], _1v3u7s1);  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));
  return main;
}