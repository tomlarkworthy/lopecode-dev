const _3fi315 = function _1(md){return(
md`# Twitter Trending Notebook Bot Dataset 2022
`
)};
const _1cavv0b = function _2(md){return(
md`Last year I published [100 Beautiful and Informative Notebooks of 2021](https://observablehq.com/@tomlarkworthy/notebooks2021) and reposted to Medium where it went viral. I will make another this year, but I thought it be good to share the Twitter data early so people can make their own celebrations of Observable excellence.

⚠️ Just remember, if you create something fair-use out of other people's work, ensure you credit them! Link them, link the notebook and give the reader context like the title.

The raw data is in this notebook as FileAttachments, but I did a little data exploration so you can see the power. I will update December on New Year's Day!
`
)};
const _8gxsp6 = function _dimension(Inputs,tweets){return(
Inputs.select(Object.keys(tweets[0]), {
  label: "dimension",
  value: "engagements"
})
)};
const _l8gwg6 = (G, _) => G.input(_);
const _1jaij4n = function _bar(Inputs,series){return(
Inputs.range([Math.min(...series), Math.max(...series)], {
  label: "The bar"
})
)};
const _1bzsgqn = (G, _) => G.input(_);
const _2lzvf1 = function _5(Plot,tweets,dimension,bar){return(
Plot.plot({
  marks: [
    Plot.ruleX(tweets, { x: "time", y: d => +d[dimension] }),
    Plot.ruleY([0]),
    Plot.ruleY([bar], { stroke: "red" })
  ]
})
)};
const _1y287p7 = function _6(html,tweetsAboveTheBar){return(
html`${tweetsAboveTheBar.map(
  (tweet) => html`<iframe border=0 frameborder=0 height=640 width=550
 src="https://twitframe.com/show?url=${encodeURIComponent(
   tweet["Tweet permalink"]
 )}"></iframe>`
)}`
)};
const _1asolom = function _tweetsAboveTheBar(tweets,dimension,bar){return(
tweets.reduce((acc, tweet) => {
  if (tweet[dimension] > bar) acc.push(tweet);
  return acc;
}, [])
)};
const _1klq0bd = function _series(tweets,dimension){return(
tweets.map((t) => t[dimension])
)};
const _3lspia = function _9(tweets){return(
tweets[0]
)};
const _604nzp = async function _database(DuckDBClient,twitter_files)
{
  const cleanAttachment = async (attachment) =>
    (await attachment.csv()).map((row) => {
      row["time"] = new Date(row["time"]);
      return row;
    });

  const database = await DuckDBClient.of({
    ...Object.fromEntries(
      await Promise.all(
        twitter_files.map(async (attachment) => [
          attachment.name,
          await cleanAttachment(attachment)
        ])
      )
    )
  });
  // Join all the files into tweets table
  database.query(`CREATE TABLE tweets AS (
    ${twitter_files
      .map((attachment) => `select * from "${attachment.name}"`)
      .join("\nUNION ALL\n")}
  )`);
  return database;
};
const _4jt7xe = function _tweets(__query,database,invalidation){return(
__query.sql(database,invalidation,"database")`select * from tweets`
)};
const _192cefa = function _twitter_files(FileAttachment){return(
[
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20220101_20220201_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20220201_20220301_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20220301_20220401_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20220401_20220501_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20220501_20220601_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20220601_20220701_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20220701_20220801_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20220801_20220901_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20220901_20221001_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20221001_20221101_en.csv"
  ),
  FileAttachment(
    "tweet_activity_metrics_trendingnotebo2_20221101_20221201_en.csv"
  )
  // FileAttachment("tweet_activity_metrics_trendingnotebo2_20221201_2023011_en.csv"),
]
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["tweet_activity_metrics_trendingnotebo2_20220801_20220901_en.csv","tweet_activity_metrics_trendingnotebo2_20220901_20221001_en.csv","tweet_activity_metrics_trendingnotebo2_20220601_20220701_en.csv","tweet_activity_metrics_trendingnotebo2_20220701_20220801_en.csv","tweet_activity_metrics_trendingnotebo2_20220501_20220601_en.csv","tweet_activity_metrics_trendingnotebo2_20220301_20220401_en.csv","tweet_activity_metrics_trendingnotebo2_20220101_20220201_en.csv","tweet_activity_metrics_trendingnotebo2_20221001_20221101_en.csv","tweet_activity_metrics_trendingnotebo2_20221101_20221201_en.csv","tweet_activity_metrics_trendingnotebo2_20220401_20220501_en.csv","tweet_activity_metrics_trendingnotebo2_20220201_20220301_en.csv"].map((name) => {
    const module_name = "@tomlarkworthy/twitter-trending-notebook-bot-dataset-2022";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_3fi315", null, ["md"], _3fi315);  
  $def("_1cavv0b", null, ["md"], _1cavv0b);  
  $def("_8gxsp6", "viewof dimension", ["Inputs","tweets"], _8gxsp6);  
  $def("_l8gwg6", "dimension", ["Generators","viewof dimension"], _l8gwg6);  
  $def("_1jaij4n", "viewof bar", ["Inputs","series"], _1jaij4n);  
  $def("_1bzsgqn", "bar", ["Generators","viewof bar"], _1bzsgqn);  
  $def("_2lzvf1", null, ["Plot","tweets","dimension","bar"], _2lzvf1);  
  $def("_1y287p7", null, ["html","tweetsAboveTheBar"], _1y287p7);  
  $def("_1asolom", "tweetsAboveTheBar", ["tweets","dimension","bar"], _1asolom);  
  $def("_1klq0bd", "series", ["tweets","dimension"], _1klq0bd);  
  $def("_3lspia", null, ["tweets"], _3lspia);  
  $def("_604nzp", "database", ["DuckDBClient","twitter_files"], _604nzp);  
  $def("_4jt7xe", "tweets", ["__query","database","invalidation"], _4jt7xe);  
  $def("_192cefa", "twitter_files", ["FileAttachment"], _192cefa);
  return main;
}