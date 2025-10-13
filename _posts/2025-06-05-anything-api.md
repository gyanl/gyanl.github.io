---
layout: post
title: "Anything API"
subtitle: An API that can do... anything.
tags: code
thumbnail: https://gyanl.com/assets/thumbs/api.png
date modified: 07-06-2025
date: 05-06-2025
---

> I didn’t want to implement rate limiting, so I have $10 in my OpenAI account and this project will stop working when the credits run out. You can fork it yourself and run it on Vercel using the details on the Github project

![Description](https://gyanl.com/assets/anything-api.jpg)

###### Try it at the playground [api.gyanl.com](http://api.gyanl.com)

One of my older AI projects had stopped working because the OpenAI davinci model had become too old and stopped working. I was puttering around with the server code that returned a json with some values and thought… if it can do this, it can probably do anything else too.

This lead to the following bit of code that takes any request at api.gyanl.com/path, takes the path, and tells an AI model to pretend that there was a working api at that path and return a json. The user can optionally specify fields to return. 

```
const { catchall, fields } = req.query;
  const path = req.url.split('?')[0]; // Get the path part of the URL

  try {
    // System prompt to guide the AI
    let systemPrompt = `You are a creative AI assistant that lives at api.gyanl.com and generates JSON responses for any endpoint. Your responses must be in well-structured JSON format with the least fields possible. The user is requesting information for the endpoint: ${path}.`;

    if (fields) {
      systemPrompt += ` Please include only the following fields in your response: ${fields}.`;
    }

    // Actual AI call
    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview", // Use gpt-4.1-mini or gpt-4-1106-preview as available
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a creative JSON response for the endpoint: ${path}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });
```

#### Why did I make this? 

1. It's kind of funny 
2. If you want to make, say, a protein tracker app, you could hit /protein-calculator/"1 boiled egg"?fields=protein-grams and get protein in grams without any additional setup.
