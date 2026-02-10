---
layout: post
title: Figma to Claude Code
subtitle: Handoffs and vibe coding in 2026
tags:
  - code
  - uiux
thumbnail: https://gyanl.com/assets/thumbs/default.png
date: 10-02-2026
---

A year ago, Andrej Karpathy tweeted about "vibe coding" — fully giving in to the vibes, letting AI write the code, and forgetting that the code even exists. The tweet got 4.5 million views, Collins named it word of the year, and Y Combinator reported that a quarter of its Winter 2025 batch had codebases that were 95% AI-generated. A few days ago, Karpathy posted a follow-up coining "agentic engineering" as the more disciplined version — AI does the implementation, but the human owns the architecture, quality, and correctness.

I've been somewhere in between. As a designer who spent four and a half years at Microsoft working on products like Word and Copilot, I was always on the design side of the handoff. I'd make the Figma file, write the specs, and wait for a developer to pick it up. Now I'm on the other side of that wall, building things myself with Claude Code, and the view is very different from here.

### The handoff is getting weird

Something has shifted in how projects start. I've had multiple recent clients send me a vibe-coded prototype and ask me to base my designs on it. Not wireframes, not a brief — a working thing they prompted into existence over a weekend. The workflow has literally inverted. Where once it made sense to wait for specs or at least wireframes before any development started, now the code sometimes comes first and design is the refinement layer.

How long should it take to design a full app? I used to say three months. Now that feels like an eternity. If you approach this with an attitude that's open to iterative testing and improvement, you can move a lot faster. But there's a real risk in this speed. AI makes the most boring, obvious solution instant. The dropdown menu. The card grid. The layout you've seen a thousand times. I think designers should be pushing for the truly great stuff — the interactions that surprise people, the details that make something feel considered. That's harder to prompt for, and it's exactly where designers earn their keep.

### Design is a lens, not a role

I've started to think of design less as a job title and more as a lens through which you approach making software. It's entirely possible that a developer and a designer spend most of their day looking at the same two things — Claude Code and Figma. The tools are converging. What's different is what you notice. Designers care about how things work and how they feel. They tend to be detail-oriented in ways that matter to the person using the product. That doesn't go away just because both people are using the same tools.

When code becomes cheap, more people want to make more things. The expectations on designers are through the roof right now. But I think this is actually exciting. If you're a designer who can articulate what "good" looks like, describe interaction patterns clearly, and push back when something feels off — you're more valuable now than you were two years ago, not less.

### Getting started: the component-first approach

If you're a designer who wants to try building with Claude Code and Figma, here's what I've found works well. Don't try to one-shot a full page on your first attempt. Start with components.

Set up your primary and secondary buttons in code first. Figure out their hover and active states. Set up your paragraph styles and heading styles. Get your color tokens defined. This is the foundation, and it's the part that benefits the most from getting right early.

One tip that saves a lot of pain: name your color variables and tokens similarly to how Tailwind or other established design systems name theirs. If your Figma variables are called things like `primary-500` or `surface-default`, the AI will understand what you mean much more reliably than if they're called `Blue 3` or `New Color Style 47`. You're essentially making your design system machine-readable, which is exactly what the AI needs.

Once your components and tokens are set up in code, you can start trying to one-shot full pages. The context window tends to run out on longer pages — you'll get a starting point, but you'll likely need to fix things component by component or section by section. If you're patient, it's possible to get very high fidelity prototypes that are automatically set up to be interactive. The kind of thing that would have taken weeks to build by hand.

### Use the online Figma MCP server

The single most useful thing for connecting Figma to Claude Code is the Figma MCP server, which lets Claude read your Figma files directly — understanding your components, variables, styles, and layout structure. It's not just looking at a screenshot; it semantically understands your design system.

Use the online hosted MCP server, not the local one. The local version is fiddlier to set up and maintain. The online server just works. Connect it, point Claude Code at a frame in your Figma file, and ask it to build what it sees. It's a bit magical the first time.

### Review the plan, even if you're not technical

I was really hoping to be able to fire off an agent and let it run in the background while I do other things. And to be fair, you can. But in practice, I've found it's worth reviewing the plan that Claude Code generates before it starts executing. Even if you're not very technical and don't fully understand every line of the plan, you can catch things — wrong assumptions, missing requirements, an approach that's going to lead somewhere you don't want.

You can also add a line to your Claude Code preferences that tells it to ask you clarifying questions before it starts working. This is a small thing that makes a big difference. It turns the interaction from "hope it does the right thing" to "have a quick conversation and then let it go." Designers already know how to give feedback and direction — this is the same skill, applied to a different collaborator.

### What this means for the handoff

The traditional design-to-developer handoff — with its redlines, its spec documents, its Zeplin exports — is fading. Not because it wasn't useful, but because the gap it was bridging is getting narrower. When a designer can build a working prototype directly from their Figma file, and a developer can read that Figma file through MCP, the handoff becomes less of an event and more of a continuous conversation.

The parts of the handoff that always mattered most were never the pixel specs anyway. It was the conversations. Why did we choose this pattern? What happens on the edge cases? How should this feel? Those questions don't go away with AI in the middle. If anything, they get more important, because the AI will happily build the wrong thing with perfect precision if nobody asks the right questions.

### Try it

If you're a designer who's been curious about this but hasn't tried it yet — just try it. Install Claude Code, connect the Figma MCP server, and ask it to build a component from one of your existing designs. You'll be surprised how far you get in an afternoon. You'll also run into limitations, and that's fine. The point isn't to replace your engineering team. The point is to close the gap between what you can imagine and what you can make, and right now that gap is smaller than it's ever been.
