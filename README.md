# Closed-Loop AI Twitter Agent

A fully autonomous, closed-loop AI agent that **observes**, **understands**, **decides**, **responds**, **learns**, and **repeats**.

## 🌟 What is this?
This is not a simple bot that spams generic replies. This is a **Closed-Loop Agentic System** designed to grow a Twitter account organically by engaging in meaningful conversations.

It consists of two main parts:
1.  **The Brain (Backend)**: Powered by **Google Gemini 2.0**, it handles classification, smart reply generation, safety checks, and long-term memory.
2.  **The Hands (Worker)**: Powered by **Playwright**, it controls a real browser to scrape tweets and post replies, simulating realistic human behavior to bypass detection.

## 🧠 Key Features

-   **👀 Intelligent Observation**: Scrapes specific niches (e.g., "startup founder", "indie hacker") to find high-relevance tweets.
-   **🧠 Smart Classification**: Uses Gemini 2.0 Flash to score tweets (0-100). Only replies to high-value tweets (Score >= 70).
-   **💬 Human-Like Replies**: Generates witty, non-corporate, "founder-mode" replies using a specific persona.
-   **🛡️ Self-Correction Loop**: Validates every reply for safety and "bot-ness". If rejected, it rewrites the reply automatically before posting.
-   **🎭 Anti-Detection**: Uses a persistent browser session (Firefox) and simulates human typing (random keystroke delays, backspaces) to act like a real user.
-   **💾 Long-Term Memory**: Stores conversation history in Supabase to reference past interactions, making conversations feel continuous and personal.

## 🏗️ Architecture

```
Twitter <--> Playwright Worker (Hands)
                   |
            Supabase DB (Memory)
                   |
            Gemini Backend (Brain)
                   |
            (Analysis & Generation)
```

1.  **Worker** scrapes tweets -> DB.
2.  **Backend** reads DB -> Classifies -> Generates Reply -> Checks Safety -> DB.
3.  **Worker** reads Reply Queue -> Simulates Human Typing -> Posts Reply.

## 🛠️ Tech Stack

-   **Runtime**: Node.js & TypeScript
-   **AI Model**: Google Gemini 2.0 Flash
-   **Browser Automation**: Playwright (Firefox)
-   **Database**: Supabase (PostgreSQL)

## 🚀 Getting Started

### Prerequisites
-   Node.js (v18+)
-   Supabase Project URL & Key
-   Google Gemini API Key
-   Twitter Account

### 1. Setup Environment
Cloning the repo and installing dependencies:

```bash
# Install Backend Dependencies
cd twitter-agent-backend
npm install

# Install Worker Dependencies
cd ../twitter-agent-worker
npm install
npx playwright install firefox
```

### 2. Configure Secrets
Create `.env` files in both directories.

**Backend (`twitter-agent-backend/.env`)**:
```env
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

**Worker (`twitter-agent-worker/.env`)**:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

### 3. Database Schema
Run the `schema.sql` file in your Supabase SQL Editor to create the necessary tables (`tweets`, `reply_queue`, `conversations`, `bot_limits`).

### 4. First Run (Login)
You need to log in *once* manually to save the session.

```bash
cd twitter-agent-worker
npm run login
# A Firefox window will open. Log in to Twitter and close the window.
```

### 5. Run the Agent 🤖

**Terminal 1 (The Brain)**:
```bash
cd twitter-agent-backend
npm run dev
```

**Terminal 2 (The Hands)**:
```bash
cd twitter-agent-worker
npm start
```

The agent will now run in a loop: scraping every 10 mins and checking for replies to post every 2 mins.
