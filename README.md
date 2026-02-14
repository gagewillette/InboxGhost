# InboxGhost

AI-powered Gmail assistant that triages inboxes, summarizes threads, and drafts high-quality replies for busy professionals.

---

## Overview

InboxGhost is an AI layer on top of Gmail designed to reduce inbox overload.

It connects securely via Gmail OAuth, analyzes email threads, builds semantic context using vector embeddings, and generates intelligent summaries and response drafts using large language models.

The goal is not to replace email — but to remove friction from it.

---

## Features

- Thread-level email summarization
- Context-aware reply drafting
- Vector-based semantic search across inbox history
- Inbox triage (priority detection, categorization)
- Secure Gmail OAuth integration
- Persistent conversation memory
- Responsive web interface

---

## Tech Stack

**Frontend**
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion

**Backend**
- Supabase (Auth, Postgres, Storage, Edge Functions)
- Node.js AI worker (background processing)
- OpenAI API (summarization + drafting)
- Pinecone (vector search)

**Infrastructure**
- OAuth2 (Gmail API)
- Server-side token management
- Secure environment variable handling

---

## Architecture

InboxGhost follows a hybrid architecture:

1. User authenticates via Gmail OAuth
2. Emails are fetched and processed server-side
3. Threads are embedded into vector space
4. Relevant context is retrieved during draft generation
5. OpenAI generates structured summaries and responses
6. Drafts are returned to the client for user approval

This design ensures:
- Minimal client-side exposure of credentials
- Efficient semantic retrieval
- Scalable AI processing

---

## Security Considerations

- Gmail tokens are stored securely server-side
- No AI processing occurs client-side
- All API keys are isolated in server environments
- Minimal data retention by design

---

## Current Status

InboxGhost is actively under development.

Planned improvements:
- Smarter prioritization heuristics
- Multi-account support
- Fine-tuned prompt optimization
- Analytics dashboard for email patterns

---

## Why This Project Exists

Email is one of the most universally used productivity tools — yet it has barely evolved.

InboxGhost is an experiment in layering intelligence over existing infrastructure without forcing users to change platforms.

---

## Author

Gage Willette  
Computer Science @ FSU  
Full-stack engineer building SaaS and AI-driven systems.
