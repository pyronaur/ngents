---
title: Explain Simply
summary: "How to give the simplest correct explanation for the actual context."
short: "Use when user asks for simple explanation"
read_when:
  - User asks for a simple explanation.
  - Need to turn full understanding into a short clear answer.
---

# Explain Simply

"If you can't explain it simply, you don't understand it well enough."

A process document provides steps an agent should take to achieve some goal.

## Purpose

Use this process when asked to explain something simply.

## Core Idea

Explaining simply is not a writing trick. It is proof of understanding.

To explain simply means to give the simplest correct explanation for the actual context. That usually means one plain sentence, simple words, no extra detail, no showing off, and no clever wording. But simple does not mean shallow. Simple means condensed, clear, and true.

This is not a rigid template. It is a way of thinking.

## How To Think Before Answering

Full context and full understanding come first.

Before you simplify, understand what is being asked, what part of the topic matters here, what the real confusion is, and which details are essential. Something that is not understood cannot be explained simply.

Once the topic is understood, compress it. Find the core truth and say it in the smallest correct form. Remove what does not help the user understand. Keep what must stay for the explanation to remain true.

## Process

### 1. Understand the full context

Before simplifying, understand:
- what is being asked
- what part of the topic matters here
- what the real confusion is
- what details are essential
- what details are noise

Do not simplify too early.

### 2. Find the core truth

Reduce the topic to its central idea.

Ask:
- What is this, at its core?
- What is the main reason this is happening?
- What is the simplest correct cause and effect?

Do not start from detail and trim down. Start from understanding and compress.

### 3. Give the simplest correct explanation

Prefer one plain sentence.

That sentence should:
- say the main truth directly
- use ordinary words
- avoid jargon when plain words work
- avoid setup and filler
- avoid unrelated detail

### 4. Add more only when needed

One sentence is not always enough.

Use two or three short sentences when:
- one sentence would be misleading
- an important condition must be included
- the topic is complicated enough that one sentence hides the truth
- a small amount of nuance is necessary to stay accurate

The correct length is the shortest length that stays true.

### 5. Keep necessary nuance

Do not remove truth just to sound simple.

A good simple explanation removes clutter. A bad simple explanation removes reality.

If the short version is accurate on its own, stop there. If the short version would create a false picture, add only the missing truth.

### 6. Stop when the explanation is clear

Do not continue after the point is made.

Do not add background just because it is available. Do not add detail just to sound thoughtful. Do not expand a clear answer into a long explanation unless the context requires it.

## Length Guide

- Use one sentence when the core truth can be said clearly and correctly in one sentence.
- Use two or three short sentences when one sentence would hide an important condition.
- Use more only when the context truly requires it.

Default to short. Expand only to protect accuracy.

## What To Avoid

Avoid:
- long formatted explanations when one sentence would do
- clever or academic wording
- jargon without need
- detail used to show understanding instead of create understanding
- vague simplification that becomes empty
- rigidly forcing one sentence when more is needed
- dropping important nuance

## Examples

### Example 1

Question:
"What does a load balancer do?"

Simple explanation:
"It spreads incoming traffic across multiple servers so no single server gets overwhelmed."

Why it works:
- One sentence is enough.
- The answer keeps the core truth.
- The wording stays plain.

### Example 2

Question:
"Explain simply why a build passes locally but fails in CI."

Simple explanation:
"It usually means the local machine has something the CI environment does not, like a missing dependency, different config, or stale cached state."

Why it works:
- It stays short.
- It adds enough detail to remain useful.
- It does not turn into a long troubleshooting guide.

### Example 3

Question:
"Why is a database query slow even though an index was added?"

Simple explanation:
"An index only helps if the database actually uses it for that query. If the query does not match the index well, or the database decides a full scan is faster, the index gets ignored."

Why it works:
- One sentence would likely hide an important condition.
- The second sentence adds necessary nuance.
- The explanation stays simple without becoming vague.

## Final Standard

A good simple explanation is clear, short, plain, correct, and shaped by context.

The goal is the simplest correct explanation, not the shortest possible sentence at any cost.
