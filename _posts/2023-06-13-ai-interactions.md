---
layout: post
title: I don't want to text an AI model
subtitle: How can you integrate LLMs into interfaces beyond chat?
tags: ideas
thumbnail: https://gyanl.com/assets/thumbs/default.png
date modified: 13-06-2023
---

As I work on Copilot for Microsoft Word, I’ve been thinking about interfaces where humans can interact with LLMs. By adding a prompt box to the Word interface, we merely changed the problem of not knowing what to write on a blank page to not knowing what to write in the prompt box on the blank page. My hot take is that it’s bad UX to expect all users to be good at writing prompts - a skill that requires quite a bit of playing around with LLMs and reading things like 

I read a great article by Maggie Appleton[^1] that inspired me to write about some of these thoughts.

### Autocomplete

Github Copilot has a fascinating interaction where typing a comment suggests a piece of code that does what the function describes. This is a unique interaction that works extremely well for code as it matches the pattern of a well documented piece of software, but is more difficult to implement for writing in English - one rarely describes the content of the following paragraph, so this type of interaction is mostly limited to suggesting the next few words.

### Assistants with personality

Giving GPT a “persona” helps generate better results in a given domain. Giving the assistant a persona can help users understand what types of results they’ll get and change the persona to suit their use case. 

There could be a “Professor” persona who critiques academic writing and enables plugins for checking plagiarism and finding sources. 

The “Orator” persona could help critique speeches and presentations to make them crisp and get the point across. An avatar could perhaps even listen to you rehearse and provide live feedback.

### Writing feedback

Google Docs like rewrite suggestions. Problem: difficult to know what has changed.

### Reading Instruction manuals with a search box

Copilot for Docs [^2]

### References

[^1]: Language Model Sketchbook, or Why I Hate Chatbots — [maggieappleton.com](https://maggieappleton.com/lm-sketchbook)

[^2]: GitHub Next — [Copilot for Docs](https://githubnext.com/projects/copilot-for-docs/)
