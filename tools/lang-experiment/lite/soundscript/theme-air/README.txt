The three stylesheets of the notebook-kit "air" theme (light) that soundscript.html does not embed,
fetched 2026-11-14 from raw.githubusercontent.com/observablehq/notebook-kit at commit 6c2ec69e (the
URLs @tomlarkworthy/themes names). verify.ts and the screenshot script serve them for those URLs so
the light theme can be rendered offline.

They are not embedded in the notebook: @tomlarkworthy/themes takes as the current theme the first
theme whose stylesheets are all embedded (air comes first), and then removes the blocks of every
other theme. A file carries one theme, the one selected when it was saved.
