# What makes Claude Code code so Well

I have been researchign and developing coding harness before Claude Code existed [https://news.ycombinator.com/item?id=38183641, Nov 2023]. I thought it be cool if coding assistents lived inside notebooks. I still think that is cool, but I have observered that even though I kepts upgrading the LLM and harness (robocoop-2, robocoop-3) my Notebook helper never got as good at coding as Claude Code on traditional codebases. 

In Feb I threw the towel in an wired Claude Code directly up to the Notebook environment. It did not work that well at first, but once I recast Notebook editing as vanilla Javascript files edited on a local filesystem, it suddenly amazing at notebook development. The same foundational model, in the same programming style, but a different harness had a radically different productivity. So there was nothing inherently difficult about Notebook coding, there was something wrong with my harnesses so far. Exactly what was wrong is the topic of this report.

<graph of mimo>

# Necissary but not sufficiant: Bash

Agents only "see" the environment through their tools. Claude Code accesses the filesystem through bash.
Because every Fronteir model trains on Terminal Bench 2.0, a linux system environment, it seemed likely that they are extra adept at bash, anecodotally consistent with how Claude Code is a CLI program.

This could be tested by giving an agent a Bash environment, in the browser Vercell built `jsut-bash` https://github.com/vercel-labs/just-bash. I observed agents can use this environment without prompting, but overall it was not as big a leap in performance as I had hoped.

When agent uses Bash, it edits files with sed or heredoc piping, and often it trips up over escaping. Claude does not code like this. However, it does like using grep to find code.

# Read/Write/Edit tool

The missing peice was Claude Code's primary file editing tools (Read/Write/Edit). These use plain strings to manipulate files on the filesystem. In my initial implementation, file edits would instantly update the Notebook and apply formatting. I found the bot would get confused if the file changed underfoot and lost the ability to edit effecively. It wasn't until I adjsuted the integration that I saw *another* leap in performance. So the contract is the file edits have to preserve byte consistency across edits. 

The final robocoop-4 architecture is a virtual filesystem containing /src, containing Javascript ESM modules that defined notebooks. On an edit, the src is compiled into a notebook that is delta patched into the running notebook. Its an extremely convoluted architecture compared to a custom tool that edits named cells, but the results speak for themselves. These result translates across models, but these experiments showed me that the details matter. 


| arm | distribution / contract | mimo | sonnet-4.6 |
|-----|-------------------------|-----:|-----------:|
| **Structured** | off-distribution semantic API (`define_variable` & friends) | **24.0** | **22.7** |
| **Bash** | on-distribution shell (sed/heredoc) | 22.7 | 16.3 |
| **Std Tools (broken contract)** | Read/Write/Edit, file reformatted between read+edit | 19.3 | 18.0 |
| **Std Tools (aligned)** | Read/Write/Edit + byte-stable `/src` | **10.3** | **8.0** |

Results come from the "" questions in the eval, which evaluates asking for a toy application and then asking for modifications.


# Userspace harness

This blog post is in the notebook environment and robocoop-4 is implemented in userspace. If you open robocoop's notebook you can execute commands in its shared shell. Robocoop can edit *this* blog post live with an OpenRouter key, and live modifications can be serialized to a single file you can [download]. The included butter-synth notebook was one of the first vibed notebook I made with the new robocoop-4 notebook using MiMo v2.5-pro, and I have included it in the bundle so you enjoy its cool sounds. 
