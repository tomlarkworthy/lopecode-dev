# Talorys: why it was noticed, and what that says about presenting Cloud Brain

Read on 2026-10-11, 08:45 to 09:05 UTC, after Tom: "have a deeper look at
https://github.com/rociiu/talorys to see why it is so popular and what id does better than us, or
informa how we might market it". One repository and one Hacker News thread were read. Nothing was
installed or run. The reading of why it rose is an opinion from one launch; the counts are measured.

## What was read

```
gh api repos/rociiu/talorys                 562 stars, 40 forks, 1 watcher, MIT, TypeScript   (09:03 UTC)
                                            created 2026-10-10 09:46 UTC, first commit 09:30
README.md                                   10,635 bytes, whole
git tree                                    147 files, 1.69 MB, 21 paths with "test"
commits                                     37; rociiu 28, KrunchMuffin 4, rudycelekli 3, dependabot 2
issues and pull requests                    10 (2 issues, 8 pull requests; 4 authors besides the owner and dependabot)
apps/agent/src/agent/memory.ts              whole (the reviewer of this file also read db/repositories/memories.ts)
hn.algolia.com/api/v1/items/50031614        288 points, 133 comments, whole   (about 08:50 UTC; 289 at 09:04)
```

Not read: the rest of the source, `docs/`, the installer's code, the screenshots. Not found: where
else it was announced (npm's download API answered "package create-talorys not found"; Reddit's
search could not be read from here). The star timeline was asked for and GitHub answered 404, so
that the stars followed the post is an inference from the dates: the post is 65 minutes after the
repository was made.

## What it is

From its README: "Your personal AI agent in your own Cloudflare account. Chat, memory, tasks, notes
and scheduled reminders, deployed with one command: npx create-talorys@latest. Free-tier friendly,
single-user, no telemetry."

```
Browser -> Cloudflare Pages (React app + /api Pages Function)
              service binding, no public URL
           Private Worker (Hono router)
           TalorysAgent, a Durable Object of the Cloudflare Agents SDK
             SQLite: conversations, memories, tasks, notes, projects, automations, sessions, settings, usage
             Workers AI: @cf/zai-org/glm-4.7-flash
             Alarms: reminders and recurring schedules
```

One person, one Durable Object, one model. It says of itself that it provisions no R2, D1, KV,
Vectorize, Workflows "or any paid service". The agent loop runs in the Worker.

## Where the attention came from

The Hacker News post "Talorys – A self-hosted personal AI agent on Cloudflare's free tier",
2026-10-10 10:52 UTC. Its 133 comments, by what they are about (a regular expression over each
comment's text, so a rough count):

```
 50  use "self-hosted", "self-managed", "on-prem" or "own hardware"; that comment and the 59 under it are 60 of the 133:
     "This might sound kinda crazy, but I define 'self-hosted' as something that I host myself."
 13  billing, neurons, the free tier
  8  lock-in, or running it off Cloudflare
  8  praise ("very easy to set up", "neat", "cool idea")
  1  the prose of the post ("It's painful to always be reading this Claudeish prose.")
  1  a defect of the product (below)
```

The thread is mostly an argument about one word of the title. Whether that argument lifted the post
or the title's other words did ("personal AI agent", "free tier") cannot be told from one thread.

## What it does that Cloud Brain does not

- **One command, and it ends at a URL.** `npx create-talorys@latest` logs in with Wrangler's OAuth
  (no API token to make), asks for a password, deploys, checks the deployment without a model call,
  and prints the address. Run again, it resumes. A commenter: "This was very easy to set up and play
  around with." A new Cloud Brain is four kinds of `brain.ts` command from a checkout with a Cloudflare API
  token in a file, `apply` once a service and `confirm` once a Worker, of which cb4 had 20 on 2026-10-11 (`running-a-cloud-brain.md`, "A new Brain"), or the Clone form of the page, which
  takes a pasted token and is listed as not tried since the deployer began to distil source, and
  never into a second account (`spec-as-built-short.md`).
- **It can be said in a line.** "One person. One Cloudflare account. One command. One personal AI agent."
- **Pictures before architecture.** Six screenshots are the second thing in the README.
- **The cost is a section.** "What is free and what may cost money": caps on output tokens, tool
  calls, AI requests a day and scheduled AI runs a day, and what still works when the allocation is
  spent. In Cloud Brain a service declares a price a method and an account has an allowance a day
  (`running-a-cloud-brain.md`, `price.list`); no page a newcomer reads says so.
- **A stranger can operate it.** Backup and import, `update`, `reset-password`, `status`, `doctor`,
  a troubleshooting table.

Three people other than the owner had sent pull requests within a day, which the above makes possible.

## What Cloud Brain does that it does not

Its memory is found by words. `selectRelevantMemories` in `apps/agent/src/agent/memory.ts`:

```ts
for (const m of repo.search(query, MAX_RELEVANT_MEMORIES)) selected.set(m.id, m);
for (const m of repo.list({ category: "preference", limit: ALWAYS_INCLUDE_PREFERENCES })) {
```

Full-text matches (BM25, in `db/repositories/memories.ts`), then the four most recently changed preferences, eight in all. The one product defect reported
in the thread is that: "I added a memory entry for 'I am a vegetarian' and then opened a chat asking
'give me some dinner ideas'. It gave me options for chicken and salmon". Issue 2 and pull requests 9
and 10 propose semantic recall. Cloud Brain's `knowledge.search` has joined words and meaning since
2026-10-11, with the measurement in `knowledge-reranking.md`. The vegetarian question itself was
not asked of Cloud Brain.

From its README and its list of tools: it is single-user by design, with no rules on who may call
what, no browser, no containers and no record of deploys. One commenter asked for web access
("Giving it the ability to access webpages / do searches would be nice!"); issue 1 on GitHub asks for MCP servers. None of this was a reason anyone gave
for starring it.

## What the thread says to avoid and to do

- **Not "self-hosted".** 50 comments. "Runs entirely inside your own Cloudflare account" is how the README
  opens, and nobody disputed that wording; "self-hosted" is in the post's title only.
- **Expect the bill to be the second subject.** "Careful with Cloudflare's 'free' AI tier", "someone's
  DO racked $34k bill", "Isn't it a free tier until they decide you should start paying or leave?".
  Talorys's caps were in the README and the thread did not mention them.
- **Write the post by hand.** One comment, and the only one about the writing.
- **Answer "can it run off Cloudflare".** Eight comments. For Talorys a commenter answered it for
  the author ("a relatively minor tweak to replace the AI calls"). For Cloud Brain the answer is not
  known; nobody has tried.
- **Workers AI is slow for chat** ("verrrrry slow for user interactive use cases") and 10,000 neurons
  is "maybe 20-30 minutes of back and forth". Cloud Brain runs no agent loop in a Worker (a turn runs in a notebook, with whatever model the
  notebook has), so a chat on Workers AI is not a thing it has to promise.

## What follows for Cloud Brain

An opinion, in the order of what it would cost to act on:

1. The Clone form is the nearest thing to their installer and is listed as not tried since the deployer changed. A
   post has nothing for a reader to do until an install into a second account has been seen to work.
2. A first page that says what one person gets, with a picture, and what it costs a day. The spec
   and the as-built record are written for the people building it.
3. The title: whose account it runs in, and one thing it does. Not "self-hosted", not "free".
4. Their reported defect as the demonstration, if Cloud Brain is first shown to pass it.

Not decided here: who Cloud Brain is for. Talorys is for one person who wants a chat assistant.
Cloud Brain has members and tokens with rules on who may call what (a second person signing in as a
member is listed as not verified in `spec-as-built-short.md`) and is built around notebooks and agents; the line that fits
Talorys does not fit it, and no line for it was tested on anyone.
