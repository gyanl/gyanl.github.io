---
layout: post
title: AI Interactions beyond Chat
subtitle: How can you integrate LLMs into interfaces without chat or prompt boxes?
tags: ideas
thumbnail: https://gyanl.com/assets/thumbs/default.png
date modified: 14-06-2023
---

As I work on Copilot for Microsoft Word, I’ve been thinking about interfaces where humans can interact with LLMs. These sophisticated tools can assist with a variety of tasks, from composing text to coding software. However, when it comes to user experience (UX), there's still much room for improvement—and my hot take is that chat or prompt boxes are rarely the best interaction paradigm.

### The problem with Prompt Boxes

Prompt boxes have a similiar problem to blank pages - people can find themselves staring at one with no idea of what to do. Instead of solving the problem, we've merely moved it from the main document to a smaller box. This approach puts a burden on users to craft effective prompts, a task that assumes a comfort with writing and a strong understanding of what LLMs are good at. This shouldn't be necessary. After all, the primary purpose of interface design is to make technology user-friendly, and to abstract away the underlying complexity.

I’ve spent quite a bit of playing around with LLMs and reading things like Awesome ChatGPT Prompts[^1], and I while I’m no authority I don’t think most people are doing this, and nor should they have to. That’s the whole point of designing interfaces - you abstract away the structure of tech

I read a great article by Maggie Appleton[^2] that inspired me to write about some of these thoughts.

### Autocomplete

Github Copilot has a fascinating interaction where typing a comment suggests a piece of code that does what the function describes. This works well in coding because it mirrors the comment-code structure of well-documented software. Applying this model to English writing is more challenging since writers rarely describe the content of a forthcoming paragraph. Still, autocomplete could potentially suggest the next few words, streamlining the writing process.

### Assistants with personality

Endowing an LLM with a "persona" could make interactions more intuitive and tailored. The persona would shape the type of assistance provided and could be adjusted according to user needs.

For example, a "Professor" persona might critique academic writing, checking for plagiarism and suggesting sources. 

An "Orator" persona, on the other hand, could offer feedback on speeches and presentations, even providing live commentary during rehearsal.

### Writing feedback

Google Docs like rewrite suggestions. However, the challenge lies in making sure users can easily understand what changes have been made.

### Reading Instruction manuals with a search box

Copilot for Docs [^3]

### References

[^1]: ChatGPT prompt curation to use ChatGPT better [awesome-chatgpt-prompts]((https://github.com/f/awesome-chatgpt-prompts))

[^2]: Language Model Sketchbook, or Why I Hate Chatbots — [maggieappleton.com](https://maggieappleton.com/lm-sketchbook)

[^3]: GitHub Next — [Copilot for Docs](https://githubnext.com/projects/copilot-for-docs/)
