---
layout: post
thumbnail: https://gyanl.com/assets/thumbs/code.png
notetype: feed
date modified: 30-09-2023
title: Developer-Designer dynamics
subtitle: Some thoughts about what it takes to collaborate effectively
tags:
  - talks
---

![Event Poster](https://gyanl.com/assets/faceoff.jpg)

> I was part of a panel called “The Ultimate Face-off” organised by ACM SIGCHI Mumbai Chapter and HCI Professionals Association of India (HCIPAI), which pitted designers against developers to address common gripes each side had with the other. This article contains some of the ideas discussed at the panel.

## Allegations Against Developers

**Designers Create Overly Complex Designs That Are Difficult to Implement**

As design tools evolve, they are increasingly able to generate responsive, working code. Tools like Figma, Webflow, and Framer can already do this, and complex animations can be readily exported as Lottie JSON files for cross-platform use. If a designer adheres to your existing design system, the transition from design to code should be smooth, with proper sizing, padding, and colors all accounted for.

_How can design-to-code tools bridge the gap between complex designs and easy implementation?_

**Designers Neglect Responsive Design Principles**

The term 'consistency' often comes up in design discussions, but it doesn't necessarily imply identical experiences across different devices. Given the variety of device affordances, such as screen size and input methods, different design patterns may be better suited for mobiles, desktops, or tablets. Well-established practices for responsive design exist, and rarely do developers and designers disagree on their application.

_What role do design systems and style guides play in ensuring consistency across various devices?_

**Designers Are Unaware of Technical Constraints**

Product development involves tough trade-offs, especially when resources are finite. Every task has an "effort-to-impact" ratio that needs to be optimized. While designers advocate for the user, the product team as a whole must decide which features make the cut in any given iteration. Opening up a dialogue between design and engineering teams can lead to better, more feasible solutions.

_How can design teams balance creative innovation with technical feasibility?_ _Should designers learn to code to improve this balance?_

**Designers Don't Clearly Communicate Design Rationale**

Both individual skills and organizational practices can contribute to this issue. Inviting developers to user research sessions can bridge the gap, but time constraints often hinder this process. Designers should focus on creating effective documentation that goes beyond the "what" to explain the "why" behind their choices.

_What strategies can improve design documentation to better convey the design rationale?_

## Allegations Against Developers

**Developers Overlook Scalability**

Prioritizing based on current information is tricky, especially when future requirements are unclear. Sometimes technical debt accumulates to the point where focusing on scalability becomes challenging without a significant refactor.

_What strategies can development teams use to factor in scalability without compromising current deliverables?_ _How can senior developers and architects influence scalability decisions?_

**Developers Prioritize Speed Over Quality**

Rushing through development to meet deadlines can result in compromised quality. However, a well-defined review process can help catch issues early. Processes like Microsoft's Craft Reviews ensure that design consistency and quality are not sacrificed for speed.

_When is it justifiable to prioritize speed over quality, and vice versa?_

**Developers Are Resistant to Design Feedback**

Accepting feedback can be difficult, but it's crucial for improvement. Viewing feedback as a constructive exercise rather than a critique can transform the development process. Regular code and product reviews can institutionalize a culture of feedback.

_How can organizations foster a culture of open, constructive feedback between designers and developers?_ _What project management tools can structure the feedback process to avoid resistance?_

**Developers Don't Adhere to Pixel-Perfect Design**

Sometimes design guidelines are not explicit enough, leading to divergences between design and implementation. Tools like Figma and Zeplin have tried to make this easier by providing different views for designers and developers, but the challenge remains.

_How crucial is pixel-perfect design to overall user experience, and does it justify additional effort?_ _Are there scenarios where deviating from pixel-perfect design could enhance the final product?_