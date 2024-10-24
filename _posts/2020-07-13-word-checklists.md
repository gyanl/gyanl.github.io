---
layout: post
title: Checklists in Microsoft Word
subtitle: Or, when you need time travel to solve a design problem
tags:
  - work
thumbnail: https://gyanl.com/assets/thumbs/microsoft.png
date modified: 24-10-2024
date: 23-09-2022
---

I once found myself tasked with adding checklists to Microsoft Word. I initially did not believe that this was too complicated. Word already has 3 types of lists—bullet lists, numbered lists, and multi-level lists. The problem statement seemed straightforward. What should the checklists experience for Word be like?

![Description](https://gyanl.com/assets/wordweb-bullets.png)

###### Bullets, numbering, and multi-level lists. 

Checklists as a UI pattern are pretty well established. You click a checklist marker, and the item switches to a checked state. Click it again, and it’s back to unchecked. That’s checklist behavior 101. I began exploring whether there was more we could do. What if we introduced a third state? Perhaps an “urgent” state for tasks that require special attention? This simple interaction could potentially add a whole new layer of utility.

![Description](/assets/wordweb-checklist-types.png)

###### Some potential types of checklists that explored different use cases and visual markers

From a design perspective, checklists could be treated as a special case of bullet lists, or we could give them a standalone entry point in the ribbon for greater discoverability. The latter approach won out because it was important for users to be able to find this new feature in order to use it.

{: .slideshow }

![Description 0](https://gyanl.com/assets/wordweb-checklist-entry-0.png)![Description 1](https://gyanl.com/assets/wordweb-checklist-entry-1.png)

### The challenge

Working on a product that’s been around for 40 years sometimes throws some really unique challenges at you. After I designed some of these neat little mockups, I found myself in a seemingly impossible situation. The Word Web team was convinced that checklists would be a useful addition to Word. The myriad other platform teams (Windows, Mac, Android, iPad, iOS) were not as convinced, and also had their own priorities and backlogs.

After some discussion, it was agreed that the Web team could try implementing the feature as an experiment, but would not initially get any bandwidth from any of the other platform teams. Target metrics were defined, and if they were met then the other teams would pick up the work later. This seemed fair enough. 

The tricky part was that documents created on Word for Web needed to continue to render correctly on all the other platforms. While Word Web users always see the latest version of the software every time they load a document in their browser, many Desktop users bought versions of Word developed years ago and continue to use them. It was not acceptable to have someone send them a document that had a checklist which they could not view correctly.

#### Revised Problem Statement

How might we implement checklists in Microsoft Word so that they work on every version of Word released in the past few years Web, Windows, Mac, Android & iOS with no code changes on those platforms?
