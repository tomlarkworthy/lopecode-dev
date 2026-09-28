// rc5-train eval (20260928-0847-m43): a maintenance refactor across modules. The notebook has grown too
// big; move the data-loading and calculation cells into a new module and import them back, with the
// controls still driving the calculations through the import.
// setup.files seeds @user/twitter: @tomlarkworthy/twitter-trending-notebook-bot-dataset-2022
// (lopebooks/notebooks/@tomlarkworthy_twitter-trending-notebook-bot-dataset-2022.html, lopebooks f7c4ae35)
// with two changes for offline use: the DuckDB `database` + `__query.sql` pair is replaced by one `tweets`
// cell that joins the parsed CSVs (same cleanAttachment body), and twitter_files lists 2 of the 11 monthly
// CSVs (Jan, Feb 2022; 39 rows). setup.init attaches those two CSVs to @user/twitter (setFileAttachment,
// as rc5t-data-file-swap does). Provenance: tools/scratch/rc5-train/20260928-0847/m43/fixtures/PROVENANCE.md.
// Cells: data loading twitter_files -> tweets; calculations series (tweets, dimension) and
// tweetsAboveTheBar (tweets, dimension, bar); controls viewof dimension (a select over tweets' columns)
// and viewof bar (a range over series); display: a Plot rule chart, the tweets above the bar (html
// iframes), tweets[0], two md cells.
//
// setup.collect, keys:
//   structure — live page: tweets, series and tweetsAboveTheBar in @user/twitter each resolve through an
//               import to a variable of a module that did not exist before the turn; none is defined
//               locally any more. (twitter_files may stay or move.)
//   live      — live page: every non-prose display cell of the unedited fixture (booted beside it as a
//               reference with the same CSVs) renders the same, at load, after choosing "impressions" in
//               the dimension select, and after setting the bar range to 100 (real input events on the
//               controls @user/twitter shows).
//   attachments — twitter_files is defined in the new module (the CSVs moved with it), not left in
//               @user/twitter and imported back.
//   errors    — no variable in @user/twitter or the new module(s) holds an error, anonymous cells included.
//   saved     — exportToHTML (as a save does), boot the file in a srcdoc frame with no network and its
//               own IndexedDB, and run `structure` and `live` there.
// M43_NEG=unchanged|copy|viewofvalue|noattach swaps the oracle for a negative control (must score low).
const FIXTURE = "const _3fi315 = function _1(md){return(\nmd`# Twitter Trending Notebook Bot Dataset 2022\n`\n)};\nconst _1cavv0b = function _2(md){return(\nmd`Last year I published [100 Beautiful and Informative Notebooks of 2021](https://observablehq.com/@tomlarkworthy/notebooks2021) and reposted to Medium where it went viral. I will make another this year, but I thought it be good to share the Twitter data early so people can make their own celebrations of Observable excellence.\n\n⚠️ Just remember, if you create something fair-use out of other people's work, ensure you credit them! Link them, link the notebook and give the reader context like the title.\n\nThe raw data is in this notebook as FileAttachments, but I did a little data exploration so you can see the power. I will update December on New Year's Day!\n`\n)};\nconst _8gxsp6 = function _dimension(Inputs,tweets){return(\nInputs.select(Object.keys(tweets[0]), {\n  label: \"dimension\",\n  value: \"engagements\"\n})\n)};\nconst _l8gwg6 = (G, _) => G.input(_);\nconst _1jaij4n = function _bar(Inputs,series){return(\nInputs.range([Math.min(...series), Math.max(...series)], {\n  label: \"The bar\"\n})\n)};\nconst _1bzsgqn = (G, _) => G.input(_);\nconst _2lzvf1 = function _5(Plot,tweets,dimension,bar){return(\nPlot.plot({\n  marks: [\n    Plot.ruleX(tweets, { x: \"time\", y: d => +d[dimension] }),\n    Plot.ruleY([0]),\n    Plot.ruleY([bar], { stroke: \"red\" })\n  ]\n})\n)};\nconst _1y287p7 = function _6(html,tweetsAboveTheBar){return(\nhtml`${tweetsAboveTheBar.map(\n  (tweet) => html`<iframe border=0 frameborder=0 height=640 width=550\n src=\"https://twitframe.com/show?url=${encodeURIComponent(\n   tweet[\"Tweet permalink\"]\n )}\"></iframe>`\n)}`\n)};\nconst _1asolom = function _tweetsAboveTheBar(tweets,dimension,bar){return(\ntweets.reduce((acc, tweet) => {\n  if (tweet[dimension] > bar) acc.push(tweet);\n  return acc;\n}, [])\n)};\nconst _1klq0bd = function _series(tweets,dimension){return(\ntweets.map((t) => t[dimension])\n)};\nconst _3lspia = function _9(tweets){return(\ntweets[0]\n)};\nconst _4jt7xe = async function _tweets(twitter_files)\n{\n  const cleanAttachment = async (attachment) =>\n    (await attachment.csv()).map((row) => {\n      row[\"time\"] = new Date(row[\"time\"]);\n      return row;\n    });\n\n  // All the files joined into one tweets table\n  return (await Promise.all(twitter_files.map(cleanAttachment))).flat();\n};\nconst _192cefa = function _twitter_files(FileAttachment){return(\n[\n  FileAttachment(\n    \"tweet_activity_metrics_trendingnotebo2_20220101_20220201_en.csv\"\n  ),\n  FileAttachment(\n    \"tweet_activity_metrics_trendingnotebo2_20220201_20220301_en.csv\"\n  )\n]\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n  $def(\"_3fi315\", null, [\"md\"], _3fi315);  \n  $def(\"_1cavv0b\", null, [\"md\"], _1cavv0b);  \n  $def(\"_8gxsp6\", \"viewof dimension\", [\"Inputs\",\"tweets\"], _8gxsp6);  \n  $def(\"_l8gwg6\", \"dimension\", [\"Generators\",\"viewof dimension\"], _l8gwg6);  \n  $def(\"_1jaij4n\", \"viewof bar\", [\"Inputs\",\"series\"], _1jaij4n);  \n  $def(\"_1bzsgqn\", \"bar\", [\"Generators\",\"viewof bar\"], _1bzsgqn);  \n  $def(\"_2lzvf1\", null, [\"Plot\",\"tweets\",\"dimension\",\"bar\"], _2lzvf1);  \n  $def(\"_1y287p7\", null, [\"html\",\"tweetsAboveTheBar\"], _1y287p7);  \n  $def(\"_1asolom\", \"tweetsAboveTheBar\", [\"tweets\",\"dimension\",\"bar\"], _1asolom);  \n  $def(\"_1klq0bd\", \"series\", [\"tweets\",\"dimension\"], _1klq0bd);  \n  $def(\"_3lspia\", null, [\"tweets\"], _3lspia);  \n  $def(\"_4jt7xe\", \"tweets\", [\"twitter_files\"], _4jt7xe);  \n  $def(\"_192cefa\", \"twitter_files\", [\"FileAttachment\"], _192cefa);\n  return main;\n}\n";
const CSV = {"tweet_activity_metrics_trendingnotebo2_20220101_20220201_en.csv":"\"Tweet id\",\"Tweet permalink\",\"Tweet text\",\"time\",\"impressions\",\"engagements\",\"engagement rate\",\"retweets\",\"replies\",\"likes\",\"user profile clicks\",\"url clicks\",\"hashtag clicks\",\"detail expands\",\"permalink clicks\",\"app opens\",\"app installs\",\"follows\",\"email tweet\",\"dial phone\",\"media views\",\"media engagements\",\"promoted impressions\",\"promoted engagements\",\"promoted engagement rate\",\"promoted retweets\",\"promoted replies\",\"promoted likes\",\"promoted user profile clicks\",\"promoted url clicks\",\"promoted hashtag clicks\",\"promoted detail expands\",\"promoted permalink clicks\",\"promoted app opens\",\"promoted app installs\",\"promoted follows\",\"promoted email tweet\",\"promoted dial phone\",\"promoted media views\",\"promoted media engagements\"\n\"1487761305826205706\",\"https://twitter.com/trendingnotebo2/status/1487761305826205706\",\"\"\"Flight Information Regions\"\" by Xavier Olive https://t.co/1zYMLRVyoI https://t.co/Ecmv6z27hD\",\"2022-01-30 12:15 +0000\",\"106.0\",\"4.0\",\"0.03773584905660377\",\"0.0\",\"0.0\",\"1.0\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"3\",\"3\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1485949366590447620\",\"https://twitter.com/trendingnotebo2/status/1485949366590447620\",\"\"\"Plot Cheatsheets\"\" by Observable https://t.co/xYmwqgwJjS https://t.co/7yhfv5Cv8C\",\"2022-01-25 12:15 +0000\",\"150.0\",\"15.0\",\"0.1\",\"0.0\",\"0.0\",\"1.0\",\"1.0\",\"11.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"2\",\"2\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1485224580746727430\",\"https://twitter.com/trendingnotebo2/status/1485224580746727430\",\"\"\"Vector Mark / Observable Plot\"\" by Observable https://t.co/BxqwjoFJOI https://t.co/mHIiWqqbKT\",\"2022-01-23 12:15 +0000\",\"125.0\",\"8.0\",\"0.064\",\"0.0\",\"0.0\",\"1.0\",\"0.0\",\"6.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1484862191413207040\",\"https://twitter.com/trendingnotebo2/status/1484862191413207040\",\"\"\"Convert Image to One Bit\"\" by Graham https://t.co/LY4i8OgKDP https://t.co/6lyqtZ0hiT\",\"2022-01-22 12:15 +0000\",\"140.0\",\"14.0\",\"0.1\",\"0.0\",\"0.0\",\"0.0\",\"3.0\",\"7.0\",\"0.0\",\"3.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1484499826498752513\",\"https://twitter.com/trendingnotebo2/status/1484499826498752513\",\"\"\"Give a user a persistent personal key for a notebook\"\" by Toph Tucker https://t.co/ozZQkCpAuq https://t.co/WL3r2RTCMY\",\"2022-01-21 12:15 +0000\",\"108.0\",\"8.0\",\"0.07407407407407407\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"2.0\",\"0.0\",\"4.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"2\",\"2\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1483775031259930629\",\"https://twitter.com/trendingnotebo2/status/1483775031259930629\",\"\"\"Differences between html and htl.html\"\" by Toph Tucker https://t.co/sZdTs400gW https://t.co/nyPERowZVP\",\"2022-01-19 12:15 +0000\",\"118.0\",\"9.0\",\"0.07627118644067797\",\"0.0\",\"0.0\",\"1.0\",\"0.0\",\"5.0\",\"0.0\",\"2.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1483412637065035778\",\"https://twitter.com/trendingnotebo2/status/1483412637065035778\",\"\"\"https://t.co/wt8Vy6XqrB Private Endpoints Released\"\" by Endpoint Services https://t.co/1Vy2tRz7Pg https://t.co/2i0WQpIpRo\",\"2022-01-18 12:15 +0000\",\"125.0\",\"6.0\",\"0.048\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"6.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1483050257915199488\",\"https://twitter.com/trendingnotebo2/status/1483050257915199488\",\"\"\"Plot of plots\"\" by Fil https://t.co/BnsaQ2gQXJ https://t.co/BlXKGiMN4x\",\"2022-01-17 12:15 +0000\",\"195.0\",\"17.0\",\"0.08717948717948718\",\"0.0\",\"0.0\",\"2.0\",\"1.0\",\"10.0\",\"0.0\",\"1.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"3\",\"3\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1482687873019228162\",\"https://twitter.com/trendingnotebo2/status/1482687873019228162\",\"\"\"D3 Gallery Index\"\" by Fabian Iwand https://t.co/raHCDGYCTX https://t.co/pB13Rr3iqx\",\"2022-01-16 12:15 +0000\",\"174.0\",\"20.0\",\"0.11494252873563218\",\"1.0\",\"0.0\",\"1.0\",\"0.0\",\"11.0\",\"0.0\",\"2.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"5\",\"5\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1481963091634106375\",\"https://twitter.com/trendingnotebo2/status/1481963091634106375\",\"\"\"Interactive Regl Wind Demo\"\" by Daniel Kao https://t.co/x3Re9XkBxf https://t.co/aeGy26rh27\",\"2022-01-14 12:15 +0000\",\"129.0\",\"6.0\",\"0.046511627906976744\",\"0.0\",\"0.0\",\"0.0\",\"1.0\",\"3.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"2\",\"2\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1481600701671395335\",\"https://twitter.com/trendingnotebo2/status/1481600701671395335\",\"\"\"Time series topological subsampling\"\" by Fil https://t.co/D7xrfOm9uu https://t.co/RiMr5ycvL5\",\"2022-01-13 12:15 +0000\",\"413.0\",\"18.0\",\"0.043583535108958835\",\"1.0\",\"0.0\",\"0.0\",\"2.0\",\"9.0\",\"0.0\",\"3.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"3\",\"3\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1481238316821401602\",\"https://twitter.com/trendingnotebo2/status/1481238316821401602\",\"\"\"Hello Bertin.js\"\" by neocarto https://t.co/t2s69K7UTo https://t.co/rtRJgH4JRV\",\"2022-01-12 12:15 +0000\",\"400.0\",\"22.0\",\"0.055\",\"0.0\",\"0.0\",\"1.0\",\"4.0\",\"12.0\",\"0.0\",\"1.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"4\",\"4\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1480875929626886149\",\"https://twitter.com/trendingnotebo2/status/1480875929626886149\",\"\"\"Plot Animation\"\" by Eric Lo https://t.co/MfHbVqDbzY https://t.co/rjykBIKrP4\",\"2022-01-11 12:15 +0000\",\"101.0\",\"4.0\",\"0.039603960396039604\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"3.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1479426375073378306\",\"https://twitter.com/trendingnotebo2/status/1479426375073378306\",\"\"\"Clifford and de Jong Attractors\"\" by Ricky Reusser https://t.co/MuvrbvSVRt https://t.co/AMTHbcXEfD\",\"2022-01-07 12:15 +0000\",\"164.0\",\"9.0\",\"0.054878048780487805\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"7.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"2\",\"2\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1479063983957200901\",\"https://twitter.com/trendingnotebo2/status/1479063983957200901\",\"\"\"Genuary 2022 / 5\"\" by Mike Bostock https://t.co/CpZjqGFP91 https://t.co/LgsIOwigUV\",\"2022-01-06 12:15 +0000\",\"145.0\",\"10.0\",\"0.06896551724137931\",\"0.0\",\"0.0\",\"1.0\",\"1.0\",\"7.0\",\"0.0\",\"1.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1478844467645923329\",\"https://twitter.com/trendingnotebo2/status/1478844467645923329\",\"\"\"Sampling mood\"\" by Toph Tucker https://t.co/00pztrV9p6 https://t.co/w7wK9VF40w\",\"2022-01-05 21:42 +0000\",\"129.0\",\"9.0\",\"0.06976744186046512\",\"0.0\",\"0.0\",\"0.0\",\"1.0\",\"6.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"2\",\"2\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1478701603431624709\",\"https://twitter.com/trendingnotebo2/status/1478701603431624709\",\"\"\"Crossfilter input\"\" by Jakub Hampl https://t.co/59nYx87CmP https://t.co/uYRTDd1Hgz\",\"2022-01-05 12:15 +0000\",\"115.0\",\"6.0\",\"0.05217391304347826\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"5.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1478339209417138186\",\"https://twitter.com/trendingnotebo2/status/1478339209417138186\",\"\"\"White Noise vs Pachinko Tree Dithering\"\" by Job van der Zwan https://t.co/WkTlrP5g8i https://t.co/xp79LhGKwH\",\"2022-01-04 12:15 +0000\",\"137.0\",\"6.0\",\"0.043795620437956206\",\"0.0\",\"0.0\",\"0.0\",\"1.0\",\"4.0\",\"0.0\",\"1.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1477976829487112195\",\"https://twitter.com/trendingnotebo2/status/1477976829487112195\",\"\"\"Wall Drawing 87\"\" by Sahil Chinoy https://t.co/zPKqYgp46x https://t.co/Nc016E6dOj\",\"2022-01-03 12:15 +0000\",\"143.0\",\"6.0\",\"0.04195804195804196\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"5.0\",\"0.0\",\"1.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n","tweet_activity_metrics_trendingnotebo2_20220201_20220301_en.csv":"\"Tweet id\",\"Tweet permalink\",\"Tweet text\",\"time\",\"impressions\",\"engagements\",\"engagement rate\",\"retweets\",\"replies\",\"likes\",\"user profile clicks\",\"url clicks\",\"hashtag clicks\",\"detail expands\",\"permalink clicks\",\"app opens\",\"app installs\",\"follows\",\"email tweet\",\"dial phone\",\"media views\",\"media engagements\",\"promoted impressions\",\"promoted engagements\",\"promoted engagement rate\",\"promoted retweets\",\"promoted replies\",\"promoted likes\",\"promoted user profile clicks\",\"promoted url clicks\",\"promoted hashtag clicks\",\"promoted detail expands\",\"promoted permalink clicks\",\"promoted app opens\",\"promoted app installs\",\"promoted follows\",\"promoted email tweet\",\"promoted dial phone\",\"promoted media views\",\"promoted media engagements\"\n\"1497908157879881730\",\"https://twitter.com/trendingnotebo2/status/1497908157879881730\",\"\"\"Shorthand / Observable Plot\"\" by Observable https://t.co/93h6Qkm12v https://t.co/aoVMLbwOUP\",\"2022-02-27 12:15 +0000\",\"81.0\",\"3.0\",\"0.037037037037037035\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"2.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1497545786892111874\",\"https://twitter.com/trendingnotebo2/status/1497545786892111874\",\"\"\"Hex grid emoji map\"\" by Graham https://t.co/qcWyuKnmfr https://t.co/cAVcUxGVna\",\"2022-02-26 12:15 +0000\",\"120.0\",\"15.0\",\"0.125\",\"0.0\",\"1.0\",\"2.0\",\"1.0\",\"6.0\",\"0.0\",\"3.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"2\",\"2\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1496821019780296705\",\"https://twitter.com/trendingnotebo2/status/1496821019780296705\",\"\"\"Minimap\"\" by Observable https://t.co/XUEGf7sCdJ https://t.co/xIyXfELnPF\",\"2022-02-24 12:15 +0000\",\"89.0\",\"5.0\",\"0.056179775280898875\",\"0.0\",\"0.0\",\"1.0\",\"0.0\",\"3.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1496096222901411851\",\"https://twitter.com/trendingnotebo2/status/1496096222901411851\",\"\"\"HTML+CSS Periodic Three-Body Orbit Spinners\"\" by Ricky Reusser https://t.co/GzgTjhb7lU https://t.co/kL1hX2HWoT\",\"2022-02-22 12:15 +0000\",\"69.0\",\"1.0\",\"0.014492753623188406\",\"0.0\",\"0.0\",\"1.0\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1495733836923211777\",\"https://twitter.com/trendingnotebo2/status/1495733836923211777\",\"\"\"Pure-CSS Periodic Three-Body Orbit Spinners\"\" by Ricky Reusser https://t.co/GzgTjhb7lU https://t.co/leonQ3kJ3i\",\"2022-02-21 12:15 +0000\",\"70.0\",\"4.0\",\"0.05714285714285714\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"3.0\",\"0.0\",\"1.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1495371445932859401\",\"https://twitter.com/trendingnotebo2/status/1495371445932859401\",\"\"\"Polygon Collisions\"\" by David Kirkby https://t.co/UJf04IeUcT https://t.co/xBJsjQPFQM\",\"2022-02-20 12:15 +0000\",\"87.0\",\"3.0\",\"0.034482758620689655\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"2.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1495009060126703618\",\"https://twitter.com/trendingnotebo2/status/1495009060126703618\",\"\"\"US Energy Production &amp; Consumption\"\" by David Pan https://t.co/NU5RCgVnjr https://t.co/8TUIUQ2ohQ\",\"2022-02-19 12:15 +0000\",\"81.0\",\"6.0\",\"0.07407407407407407\",\"0.0\",\"0.0\",\"1.0\",\"0.0\",\"5.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1494646691336798209\",\"https://twitter.com/trendingnotebo2/status/1494646691336798209\",\"\"\"Survey Slate | Survey Filler UI\"\" by https://t.co/v84i4voh4l https://t.co/wnzjn8ZcFB https://t.co/OTumNBTWcV\",\"2022-02-18 12:15 +0000\",\"65.0\",\"8.0\",\"0.12307692307692308\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"4.0\",\"0.0\",\"1.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"3\",\"3\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1493921896605401091\",\"https://twitter.com/trendingnotebo2/status/1493921896605401091\",\"\"\"Instead of more colors, try an input to highlight your bar chart\"\" by Zan https://t.co/MApK2Sbk5J https://t.co/EnwVxg0wrH\",\"2022-02-16 12:15 +0000\",\"66.0\",\"3.0\",\"0.045454545454545456\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"2.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1493559522299949059\",\"https://twitter.com/trendingnotebo2/status/1493559522299949059\",\"\"\"Visualization Valentine with Vega-Lite API\"\" by Dominik Moritz https://t.co/xKo5BnEO14 https://t.co/p8RsM0LBOF\",\"2022-02-15 12:15 +0000\",\"88.0\",\"8.0\",\"0.09090909090909091\",\"0.0\",\"0.0\",\"1.0\",\"1.0\",\"5.0\",\"0.0\",\"1.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1492472343804928005\",\"https://twitter.com/trendingnotebo2/status/1492472343804928005\",\"\"\"Hello, pintora\"\" by Andrew Wooldridge https://t.co/6Zgu1WQWVW https://t.co/YB8SMXhZgO\",\"2022-02-12 12:15 +0000\",\"111.0\",\"10.0\",\"0.09009009009009009\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"7.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"3\",\"3\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1492109957566767107\",\"https://twitter.com/trendingnotebo2/status/1492109957566767107\",\"\"\"Create a ggplot style legend using Plot\"\" by Ashish Singh https://t.co/LUYMC1yZCm https://t.co/8RuD3fCO37\",\"2022-02-11 12:15 +0000\",\"114.0\",\"8.0\",\"0.07017543859649122\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"3.0\",\"0.0\",\"3.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"2\",\"2\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1491747578312019977\",\"https://twitter.com/trendingnotebo2/status/1491747578312019977\",\"\"\"Words Known Better by Males Than Females, and Vice Versa\"\" by Yuri Vishnevsky https://t.co/MCb1SvnrEM https://t.co/7CTXgny0Yv\",\"2022-02-10 12:15 +0000\",\"186.0\",\"24.0\",\"0.12903225806451613\",\"1.0\",\"0.0\",\"2.0\",\"1.0\",\"9.0\",\"0.0\",\"2.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"9\",\"9\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1490660454288568324\",\"https://twitter.com/trendingnotebo2/status/1490660454288568324\",\"\"\"Automatically Backup Observable notebooks to Github\"\" by Tom Larkworthy https://t.co/HuZLQpCEc8 https://t.co/fiXNeUjftV\",\"2022-02-07 12:15 +0000\",\"230.0\",\"25.0\",\"0.10869565217391304\",\"1.0\",\"0.0\",\"4.0\",\"6.0\",\"10.0\",\"0.0\",\"3.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1490298025268416516\",\"https://twitter.com/trendingnotebo2/status/1490298025268416516\",\"\"\"findTriangle() for D3.Delaunay and Delaunator\"\" by Fabian Iwand https://t.co/fvOZEoKGHn https://t.co/sAEEtlSYSu\",\"2022-02-06 12:15 +0000\",\"108.0\",\"5.0\",\"0.046296296296296294\",\"0.0\",\"0.0\",\"1.0\",\"0.0\",\"3.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1489935632096968709\",\"https://twitter.com/trendingnotebo2/status/1489935632096968709\",\"\"\"100+ Command Line Tools for Data Visualization\"\" by Alex Garcia https://t.co/yPWBMsWC8J https://t.co/77mQN2KNP1\",\"2022-02-05 12:15 +0000\",\"130.0\",\"13.0\",\"0.1\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"12.0\",\"0.0\",\"1.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1489573232898412549\",\"https://twitter.com/trendingnotebo2/status/1489573232898412549\",\"\"\"Circular Sankey Diagram\"\" by Ralph Spandl https://t.co/8McUUGct9g https://t.co/04b4TsT1X8\",\"2022-02-04 12:15 +0000\",\"118.0\",\"8.0\",\"0.06779661016949153\",\"0.0\",\"0.0\",\"2.0\",\"0.0\",\"3.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"3\",\"3\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1489210846584741890\",\"https://twitter.com/trendingnotebo2/status/1489210846584741890\",\"\"\"Ilots de chaleur, la marque d’une injustice climatique\"\" by Cedric Rossi https://t.co/v4Z2b9R8nj https://t.co/oTruAfmIGj\",\"2022-02-03 12:15 +0000\",\"84.0\",\"2.0\",\"0.023809523809523808\",\"0.0\",\"0.0\",\"0.0\",\"1.0\",\"0.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1488848472845520904\",\"https://twitter.com/trendingnotebo2/status/1488848472845520904\",\"\"\"Transparent Color Widget\"\" by Fabian Iwand https://t.co/ASPRlS2iEo https://t.co/3A4J0690jA\",\"2022-02-02 12:15 +0000\",\"107.0\",\"11.0\",\"0.102803738317757\",\"0.0\",\"0.0\",\"0.0\",\"1.0\",\"7.0\",\"0.0\",\"2.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"1\",\"1\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n\"1488486078944366592\",\"https://twitter.com/trendingnotebo2/status/1488486078944366592\",\"\"\"044 Fifteen silly ways to draw a line\"\" by Saneef H. Ansari https://t.co/EpHr54gZW3 https://t.co/3xmjidG8UD\",\"2022-02-01 12:15 +0000\",\"158.0\",\"8.0\",\"0.05063291139240506\",\"0.0\",\"0.0\",\"3.0\",\"0.0\",\"1.0\",\"0.0\",\"0.0\",\"0.0\",\"0\",\"0\",\"0\",\"0\",\"0\",\"4\",\"4\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\",\"-\"\n"};
const MOD = "@user/twitter";
const MOVED = ["tweets", "series", "tweetsAboveTheBar"];

const INIT = String.raw`(async () => {
  const reg = globalThis.__ojs_runtime;
  globalThis.__rc5tBaseMods = [...reg.mains.keys()].filter(k => k !== ${JSON.stringify(MOD)});
  const rt = [...reg.mains.values()].find(m => m && m._runtime)._runtime;
  const v = [...rt._variables].find(v => v._name === "setFileAttachment" && typeof v._value === "function");
  if (!v) throw new Error("init: no setFileAttachment");
  const mod = reg.mains.get(${JSON.stringify(MOD)});
  if (!mod) throw new Error("init: no " + ${JSON.stringify(MOD)});
  const CSV = ${JSON.stringify(CSV)};
  for (const [name, text] of Object.entries(CSV)) await v._value(new File([text], name, { type: "text/csv" }), mod);
  const listed = () => [...rt._variables].some(x => x._name === "all_module_files" && Array.isArray(x._value) && Object.keys(CSV).every(n => x._value.some(f => f.name === n)));
  for (let i = 0; i < 60 && !listed(); i++) await new Promise(r => setTimeout(r, 250));
  await new Promise(r => setTimeout(r, 2000));
})()`;

const COLLECT = String.raw`(async () => {
  const FIXTURE = ${JSON.stringify(FIXTURE)};
  const CSV = ${JSON.stringify(CSV)};
  const MOD = ${JSON.stringify(MOD)};
  const MOVED = ${JSON.stringify(MOVED)};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  const base = new Set(globalThis.__rc5tBaseMods || []);
  const out = { structure: "not run", attachments: "not run", live: "not run", saved: "not run", errors: "not run", ms: {} };
  const rtOf = reg => [...reg.mains.values()].find(m => m && m._runtime)._runtime;
  const norm = s => String(s).replace(/\b(inputs-[0-9a-f]+|__ns__)-\d+/g, "$1-N").replace(/\bplot-[0-9a-f]+(-\d+)?/g, "plot-X").replace(/\s+/g, " ").trim();
  const sig = x => {
    if (x && x.nodeType === 1) {
      const vals = [...x.querySelectorAll("input,select")].map(i => i.type + "=" + i.value).join(";");
      return "EL " + norm(x.outerHTML) + " || " + vals;
    }
    if (typeof x === "function") return "FN";
    try { return "V " + JSON.stringify(x); } catch { return "V " + String(x); }
  };
  const isImport = (v, mod) => (v._inputs || []).length === 1 && v._inputs[0]._module !== mod;
  const loaderPending = v => (v._inputs || []).some(i => String(i._name).startsWith("module ") || i._name === "@variable");
  // each moved name in @user/twitter, followed through its import to the defining variable
  const structure = (reg) => {
    const rt = rtOf(reg);
    const mod = reg.mains.get(MOD);
    if (!mod) return { verdict: "no " + MOD + " module" };
    const vars = [...rt._variables];
    const homes = new Map();
    for (const h of MOVED) {
      const v = vars.find(x => x._module === mod && x._name === h);
      if (!v) return { verdict: h + " is not defined or imported in " + MOD };
      if (loaderPending(v))
        return { verdict: h + ": the import did not resolve (loader pending or failed" + (v._error ? ": " + String(v._error.message || v._error).slice(0, 120) : "") + ")" };
      let s = v, hops = 0;
      while (s._inputs && s._inputs.length === 1 && s._inputs[0]._module !== s._module && hops < 6) { s = s._inputs[0]; hops++; }
      if (s._module === mod) return { verdict: h + " is still defined in " + MOD + " (not moved)" };
      homes.set(h, s._module);
    }
    const names = [];
    for (const home of new Set(homes.values())) {
      const loader = vars.find(x => x._module === mod && String(x._name).startsWith("module ") && x._value === home);
      const name = loader ? loader._name.slice(7) : [...reg.mains].find(([, m]) => m === home)?.[0];
      if (!name) return { verdict: "a moved cell lives in a module " + MOD + " has no loader for" };
      if (name === MOD || base.has(name)) return { verdict: "moved cells come from a module that existed before: " + name };
      names.push(name);
    }
    return { verdict: "ok", homes: [...new Set(homes.values())], names };
  };
  const probe = async (src) => {
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const define = (await import(url)).default;
    const cells = [];
    const rec = { define(...a) {
      const [name, inputs, fn] = a.length >= 3 ? a : a.length === 2 ? (typeof a[0] === "string" ? [a[0], [], a[1]] : [null, a[0], a[1]]) : [null, [], a[0]];
      cells.push({ name, inputs, fn }); return this; } };
    const fakeMod = { variable: () => Object.create(rec), define: (...a) => Object.create(rec).define(...a), builtin() {}, import() { return this; }, derive() { return this; } };
    define({ module: () => fakeMod, fileAttachments: () => null }, () => undefined);
    return cells;
  };
  const hosts = [];
  let currentDoc = document;
  const mountingObserver = (doc) => {
    let host = hosts.find(h => h.ownerDocument === doc);
    if (!host) { host = doc.createElement("div"); host.style.cssText = "position:fixed;left:-20000px;top:0;width:800px"; doc.body.appendChild(host); hosts.push(host); }
    return { pending() {}, rejected() {}, fulfilled(v) {
      if (v && v.nodeType === 1 && !v.isConnected) { const w = doc.createElement("div"); w.className = "observablehq"; w.appendChild(v); host.appendChild(w); }
    } };
  };
  // re-run every cell of a module as an observed mirror (named: an alias; anonymous: the same definition)
  const render = async (mod, deadline, anon) => {
    const rt = mod._runtime;
    const doc = currentDoc;
    const vars = [...rt._variables].filter(v => v._module === mod && v._definition && !(anon && !v._name) &&
      !loaderPending(v) && !String(v._name).startsWith("module ") && v._name !== "@variable" && !(v._name && isImport(v, mod)));
    const mirrors = vars.map(v => {
      const inputs = (v._inputs || []).map(i => i._name);
      const m = mod.variable(v._name ? true : mountingObserver(doc));
      try { v._name ? m.define([v._name], x => x) : m.define(inputs, v._definition); } catch (e) { return { v, m, bad: e }; }
      return { v, m, inputs };
    });
    for (const c of anon || []) {
      const m = mod.variable(mountingObserver(doc));
      try { m.define(c.inputs, c.fn); mirrors.push({ v: { _name: null }, m, inputs: c.inputs }); } catch (e) { mirrors.push({ v: { _name: null }, m, inputs: c.inputs, bad: e }); }
    }
    try { rt._computeSoon?.(); } catch {}
    const settled = () => mirrors.every(x => x.bad || x.m._value !== undefined || x.m._error != null);
    while (!settled() && Date.now() < deadline) await sleep(200);
    await sleep(300);
    return mirrors;
  };
  const missing = (want, got) => { const g = [...got]; return want.filter(w => { const i = g.indexOf(w); if (i < 0) return true; g.splice(i, 1); return false; }); };
  const isProse = x => !x.v._name && x.inputs.length === 1 && x.inputs[0] === "md";
  const snapshot = (mirrors) => mirrors.filter(x => !x.v._name && !isProse(x)).map(x => sig(x.m._value)).sort();
  // a cell still pending at the deadline counts too (a FileAttachment the module does not have never settles)
  const errorsOf = (mirrors, label) => mirrors.filter(x => x.bad || x.m._error != null || x.m._value === undefined)
    .map(x => label + "." + (x.v._name || "<anon " + (x.inputs || []).join(",") + ">") + ": " + (x.bad || x.m._error != null ? String(x.bad?.message ?? x.m._error?.message ?? x.m._error).slice(0, 120) : "did not compute"));
  // the controls the module shows, found by their labels among the rendered values
  const control = (mirrors, sel, label) => mirrors.map(x => x.m._value).filter(e => e && e.nodeType === 1)
    .flatMap(e => [...(e.matches?.(sel) ? [e] : []), ...e.querySelectorAll(sel)]).find(i => new RegExp(label).test(i.closest("form")?.textContent || ""));
  const fire = (el) => el.dispatchEvent(new (el.ownerDocument.defaultView.Event)("input", { bubbles: true }));
  const steps = [
    async (ms) => { const s = control(ms, "select", "dimension"); if (!s) return "no dimension select"; s.value = "impressions"; fire(s); await sleep(1200); },
    async (ms) => { const r = control(ms, "input[type=range]", "The bar"); if (!r) return "no bar range"; r.value = "100"; fire(r); await sleep(1200); },
  ];
  const STEP = ["at load", "after choosing impressions", "after setting the bar to 100"];
  const drive = async (ms, snaps) => {
    snaps.push(snapshot(ms));
    for (const s of steps) { const err = await s(ms); if (err) return err; snaps.push(snapshot(ms)); }
    return null;
  };
  const check = async (reg, deadline, ref, anon) => {
    const st = structure(reg);
    const res = { structure: st.verdict, errors: [], display: "not run" };
    const mod = reg.mains.get(MOD);
    if (!mod) return res;
    const mods = [[MOD, mod], ...(st.homes || []).map((m, i) => [st.names[i], m])];
    const all = [];
    try {
      for (const [label, m] of mods) { const ms = await render(m, deadline, anon?.[label]); all.push(ms); res.errors.push(...errorsOf(ms, label)); }
      const snaps = [];
      const err = await drive(all[0], snaps);
      if (err) res.display = err;
      else {
        res.display = "ok";
        for (let i = 0; i < snaps.length; i++) {
          const m = missing(ref.snaps[i], snaps[i]);
          if (m.length) { res.display = m.length + " display cell(s) differ " + STEP[i] + ", e.g. " + m[0].slice(0, 200); res.got = snaps[i].map(s => s.slice(0, 160)); break; }
        }
      }
    } finally { for (const ms of all) for (const x of ms) { try { x.m.delete(); } catch {} } }
    return res;
  };
  const reg0 = globalThis.__ojs_runtime;
  const rt = rtOf(reg0);
  // 1. save first, as save-in-place does, before anything below adds modules to the page
  let html = null;
  try {
    const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
    const raw = String(location.hash || "").replace(/^#/, "");
    const drop = new Set(["cc", "open", "close", "filesync", "from", "focus"]);
    const kept = raw.split("&").filter(Boolean).filter(p => !drop.has(p.split("=")[0]));
    const r = await f({ mains: new Map(reg0.mains), runtime: rt, options: { hash: kept.length ? "#" + kept.join("&") : "" } });
    html = typeof r === "string" ? r : r.source;
    out.exportBytes = html.length;
  } catch (e) { out.saved = "export threw: " + (e?.message ?? e); }
  out.ms.export = Date.now() - t0;
  // 2. reference: the unedited fixture booted beside it, reading the same CSVs
  const ref = { snaps: [] };
  try {
    const url = URL.createObjectURL(new Blob([FIXTURE], { type: "text/javascript" }));
    const define = (await import(url)).default;
    const files = new Map(Object.entries(CSV).map(([n, t]) => [n, { url: URL.createObjectURL(new Blob([t], { type: "text/csv" })), mimeType: "text/csv" }]));
    const refMod = define({ module: () => { const m = rt.module(); m.builtin("FileAttachment", rt.fileAttachments(n => files.get(n))); return m; }, fileAttachments: (...a) => rt.fileAttachments(...a) }, () => undefined);
    const ms = await render(refMod, Date.now() + 6000);
    ref.errors = errorsOf(ms, "reference");
    const err = await drive(ms, ref.snaps);
    for (const x of ms) { try { x.m.delete(); } catch {} }
    if (err || ref.errors.length) { out.live = out.saved = "reference broken: " + (err || ref.errors.join("; ")); return out; }
    // each step must change what the reference shows, or the live check would not test reactivity
    for (let i = 1; i < ref.snaps.length; i++) if (!missing(ref.snaps[i], ref.snaps[i - 1]).length) { out.live = out.saved = "reference did not react " + STEP[i]; return out; }
    out.refCells = ref.snaps[0].length;
  } catch (e) { out.live = out.saved = "reference threw: " + (e?.message ?? e); return out; }
  out.ms.ref = Date.now() - t0;
  // 3. live page
  const live = await check(reg0, Date.now() + 6000, ref);
  out.structure = live.structure;
  // attachments: twitter_files (the FileAttachment handles, and so the CSVs) moved with the data, i.e. it is
  // defined in the new module, not left in @user/twitter for the new module to import back
  {
    const st = structure(reg0), mod = reg0.mains.get(MOD);
    const vars = [...rt._variables];
    const tf = [...(st.homes || [])].map(h => vars.find(x => x._module === h && x._name === "twitter_files")).find(Boolean);
    if (st.verdict !== "ok") out.attachments = "structure: " + st.verdict;
    else if (!tf) out.attachments = "twitter_files is not in the new module";
    else {
      let s = tf, hops = 0;
      while (s._inputs && s._inputs.length === 1 && s._inputs[0]._module !== s._module && hops < 6) { s = s._inputs[0]; hops++; }
      out.attachments = s._module === mod ? "twitter_files (and its CSVs) stayed in " + MOD + "; the new module imports it back"
        : !Array.isArray(s._value) ? "twitter_files in the new module has no value" : "ok";
    }
  }
  out.live = live.display; out.errors = live.errors.length ? live.errors.join("; ") : "none";
  if (live.got) out.liveGot = live.got;
  out.ms.live = Date.now() - t0;
  // 4. the saved file, reopened with no network
  if (html) {
    let frame;
    try {
      const csp = '<meta http-equiv="Content-Security-Policy" content="default-src file: blob: data: \'unsafe-inline\' \'unsafe-eval\'; connect-src file: blob: data:; worker-src blob: data:">';
      const savedHtml = html;
      const freshIdb = "<script>{const o=IDBFactory.prototype.open;const s='-rc5t-'+Math.random().toString(36).slice(2);IDBFactory.prototype.open=function(n,...a){return o.call(this,n+s,...a)}}<\/script>";
      html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + csp + freshIdb) : csp + freshIdb + html;
      frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;left:0;top:0;width:900px;height:700px;z-index:2147483647;background:#fff";
      frame.srcdoc = html;
      document.body.appendChild(frame);
      const deadline = t0 + 27000; // setup.collect is bounded at 30 s by driver-core
      while (Date.now() < deadline && !(frame.contentWindow?.__ojs_runtime?.mains?.get?.(MOD))) await sleep(250);
      const reg = frame.contentWindow?.__ojs_runtime;
      if (!reg?.mains?.get?.(MOD)) out.saved = "saved notebook did not boot " + MOD;
      else {
        let last = null, since = Date.now();
        while (Date.now() < deadline - 8000) {
          const m = reg.mains.get(MOD);
          const key = m ? [...rtOf(reg)._variables].filter(v => v._module === m).map(v => (v.pid || "") + ":" + (v._name || "") + ":" + (v._inputs || []).length).sort().join("|") : null;
          if (key !== last) { last = key; since = Date.now(); }
          if (Date.now() - since > 1500 && structure(reg).verdict === "ok") break;
          await sleep(250);
        }
        out.ms.boot = Date.now() - t0;
        // anonymous cells are re-run from the saved blocks (a headless reopen does not always keep them)
        const doc = new DOMParser().parseFromString(savedHtml, "text/html");
        const anon = {};
        for (const label of [MOD, ...(structure(reg).names || [])]) {
          const block = doc.getElementById(label);
          if (!block) { out.saved = "no " + label + " block in the saved file"; break; }
          anon[label] = (await probe(block.textContent)).filter(c => c.name == null);
        }
        currentDoc = frame.contentDocument;
        const s = out.saved.startsWith("no ") ? null : await check(reg, Math.min(deadline, Date.now() + 8000), ref, anon);
        if (s) {
          out.savedErrors = s.errors.length ? s.errors.join("; ") : "none";
          out.saved = s.structure !== "ok" ? "structure: " + s.structure : s.errors.length ? "errors: " + s.errors.join("; ").slice(0, 300) : s.display === "ok" ? "ok" : "display: " + s.display;
          if (s.got) out.savedGot = s.got;
        }
      }
    } catch (e) { out.saved = "saved check threw: " + (e?.message ?? e); }
    finally { frame?.remove(); }
  }
  for (const h of hosts) { try { h.remove(); } catch {} }
  out.ms.total = Date.now() - t0;
  return out;
})()`;

// --- oracle: the data and calculation cells into @user/twitter-data, imported back with the loader +
// binding pair of @tomlarkworthy/rate-estimation-min (lopebooks/notebooks/@tomlarkworthy_rate-estimation-min.html);
// the calculations import the controls' values (dimension, bar) from @user/twitter the same way.
const cellSrc = (name) => {
  const m = FIXTURE.match(new RegExp("const (_\\w+) = (async )?function\\*? _" + name + "\\([\\s\\S]*?\\n\\)?\\};\\n"));
  if (!m) throw new Error("m43 eval: no cell " + name);
  return { src: m[0], pid: m[1] };
};
const DEFLINE = (pid) => FIXTURE.match(new RegExp("  \\$def\\(\"" + pid + "\"[^\\n]*\\n"))[0];
const DATA = ["twitter_files", "tweets", "series", "tweetsAboveTheBar"];
const loader = (m) => `  main.define("module ${m}", async () => runtime.module((await import("/${m}.js?v=4")).default));\n`;
const binding = (m, n, src) => `  main.define("${n}", ["module ${m}", "@variable"], (_, v) => v.import("${src || n}", _));\n`;
const dataModule = (imports, rewrite = s => s) => DATA.map(n => rewrite(cellSrc(n).src)).join("") + `
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

${DATA.map(n => DEFLINE(cellSrc(n).pid)).join("")}${imports}  return main;
}
`;
const userWithout = (names, from) => {
  let s = FIXTURE;
  for (const n of names) { const c = cellSrc(n); s = s.replace(c.src, "").replace(DEFLINE(c.pid), ""); }
  if (!from) return s;
  return s.replace("  return main;\n}", loader(from) + MOVED.map(n => binding(from, n)).join("") + "  return main;\n}");
};
const DATAMOD = "@user/twitter-data";
const attach = (mod) => Object.entries(CSV).map(([name, content]) => ({ tool: "attach_file", args: { module: mod, name, content, mime: "text/csv" } }));
const good = loader(MOD) + binding(MOD, "dimension") + binding(MOD, "bar");
const NEG = process.env.M43_NEG || "";
const oracle =
  NEG === "unchanged" ? []
  // copy: the cells duplicated into a new module, @user/twitter untouched (nothing imported)
  : NEG === "copy" ? [
    { tool: "write_file", args: { file_path: `/src/${DATAMOD}.js`, content: dataModule(good) } }, ...attach(DATAMOD)]
  // viewofvalue: the new module imports the controls' viewof elements and reads .value, so the
  // calculations run once and never react to the controls
  : NEG === "viewofvalue" ? [
    { tool: "write_file", args: { file_path: `/src/${DATAMOD}.js`, content: dataModule(
        loader(MOD) + binding(MOD, "viewof dimension") + binding(MOD, "viewof bar"),
        s => s.replace(/_(series|tweetsAboveTheBar)\(tweets,dimension(,bar)?\)\{return\(/, (m, n, b) => `_${n}(tweets,$dimension${b ? ",$bar" : ""}){const dimension = $dimension.value${b ? ", bar = $bar.value" : ""};return(`)
      ).replace('["tweets","dimension","bar"]', '["tweets","viewof dimension","viewof bar"]').replace('["tweets","dimension"]', '["tweets","viewof dimension"]') } }, ...attach(DATAMOD),
    { tool: "write_file", args: { file_path: `/src/${MOD}.js`, content: userWithout(DATA, DATAMOD) } }]
  // noattach: the correct refactor, but the CSVs are left on @user/twitter
  : NEG === "noattach" ? [
    { tool: "write_file", args: { file_path: `/src/${DATAMOD}.js`, content: dataModule(good) } },
    { tool: "write_file", args: { file_path: `/src/${MOD}.js`, content: userWithout(DATA, DATAMOD) } }]
  : [
    { tool: "write_file", args: { file_path: `/src/${DATAMOD}.js`, content: dataModule(good) } }, ...attach(DATAMOD),
    { tool: "write_file", args: { file_path: `/src/${MOD}.js`, content: userWithout(DATA, DATAMOD) } }];

export default {
  id: "rc5t-split-data-module",
  category: "rc5-train",
  question: "My notebook has got too big. Move the data-loading and calculation cells into a separate module and have the notebook import them from there. Everything should still show and work the same.",
  setup: { files: { [`/src/${MOD}.js`]: FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "structure", equals: "ok" }, weight: 2 },
    // the controls still recompute the calculations through the import
    { name: "collected_equals", args: { key: "live", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "saved", equals: "ok" }, weight: 3 },
    // the data moved with its loader: the CSVs are attached to the new module (base run: they could not be copied)
    { name: "collected_equals", args: { key: "attachments", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
  ],
  oracle,
};
