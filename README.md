# Thenali AI — Bharat AI Operational Hub

> **AI for Bharat Hackathon | Powered by AWS**
> An AI-powered Developer Intelligence Platform built to empower Indian developers with deep repository analysis, personalized learning, voice-enabled assessments, and open-source contribution readiness — all running on AWS.

---

## What is Thenali AI?

Thenali AI is a full-stack developer intelligence platform that bridges the gap between learning and real-world contribution. It uses Amazon Bedrock (Nova Pro), FAISS vector search, and a suite of AWS services to give developers a personalized, AI-driven path from beginner to open-source contributor.

The name "Thenali" is inspired by Tenali Rama — the legendary Indian scholar and wit — symbolizing intelligence, wisdom, and the spirit of learning.

---

## The Problem We Solve

Indian developers face three core challenges:
1. **No personalized learning path** — generic tutorials don't adapt to your stack, goals, or pace.
2. **Repository complexity** — joining an open-source project is overwhelming without deep codebase understanding.
3. **No readiness signal** — developers don't know when they're ready to contribute or what to contribute to.

Thenali AI solves all three with AI.

---

## Core Features

### Repository Intelligence (RAG Pipeline)
- Paste any public GitHub URL — Thenali clones it, parses every source file, chunks the code semantically, and builds a FAISS vector index.
- Amazon Bedrock Nova Pro generates a full intelligence report: architecture summary, tech stack detection, complexity score (0–100), design patterns, security risks, contribution opportunities, and a Mermaid architecture diagram.
- Ask natural language questions about the codebase — the RAG pipeline retrieves the most relevant code chunks and Bedrock answers with full context.

### Personalized Learning Roadmaps
- Tell Thenali your goal (e.g., "Build a REST API with FastAPI"), your current level, and your timeline.
- Bedrock generates a multi-phase roadmap with topics, subtopics, milestones, projects, and time estimates — all saved to DynamoDB.
- Each concept follows a 5-step learning flow: reading → code examples → flashcard quiz → viva questions → integrity check.
- Progress is tracked per concept, per phase, per roadmap.

### AI-Powered Assessments
- Start a text or voice assessment on any topic.
- Questions are generated dynamically by Bedrock, calibrated to your skill level.
- Answers are evaluated by AI with scores of 0, 5, or 10 per question.
- Skill gap analysis identifies exactly where you need to improve.
- Repository-contextual assessments use RAG to ask questions about a specific codebase you've analyzed.

### Voice Learning (Amazon Polly + Whisper)
- Every assessment question can be read aloud using Amazon Polly (voice: Kajal, en-IN).
- Answer by speaking — local OpenAI Whisper transcribes your voice to text.
- Full audio lesson playback for accessible, hands-free learning.

### Code Lab (Sandboxed Playground)
- Write and run Python code directly in the browser using Monaco Editor.
- Code executes in a RestrictedPython sandbox — no filesystem access, no network calls, no dangerous imports.
- AI analyzes your code for quality, complexity, best practices, and suggests improvements.
- Session history saved to DynamoDB.

### Contribution Readiness Engine
- Tracks your repos analyzed, assessments passed, roadmaps completed, and concept mastery.
- Calculates a Contribution Readiness Score (0–100) with a label: Beginner → Growing → Active → Expert Contributor.
- AI recommends 6 personalized open-source repositories matched to your skill set, with beginner issues, skill gap mapping, and estimated effort.
- AI auto-fills your contribution profile form based on your actual activity data.
- Unlocks after completing 5 courses or 5 assessments — gamified progression.

### Dashboard & Progress Tracking
- Real-time stats: repos analyzed, roadmaps created, assessment scores, concept mastery.
- Skill mastery visualization with Recharts.
- Recent activity feed with notifications.
- Rank system: Novice → Contributor → Senior → Expert.

### Notifications
- Real-time notification bell for completed repo analyses, assessment results, and milestones.
- Activity log stored in DynamoDB.

### Multi-Language Support
- Full UI translation system via `LanguageContext`.
- Supports English and regional Indian languages.
- Amazon Polly supports `en-IN` voice (Kajal) natively.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework, SSR, routing |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| Framer Motion | Animations |
| Zustand | Global state management |
| Monaco Editor | In-browser code editor |
| React Flow | Roadmap/architecture visualizations |
| Recharts | Charts and skill graphs |
| Axios | HTTP client with JWT interceptors |
| React Hook Form + Zod | Form validation |
| React Dropzone | File/ZIP upload |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI (Python 3.11+) | REST API framework |
| Uvicorn + uvloop | ASGI server, async event loop |
| Pydantic v2 | Request/response validation |
| FAISS (faiss-cpu) | Vector similarity search |
| SentenceTransformers | Code embeddings (all-MiniLM-L6-v2) |
| GitPython | Repository cloning |
| OpenAI Whisper (local) | Speech-to-text transcription |
| Passlib + bcrypt | Password hashing |
| PyJWT | JWT authentication |
| Tenacity | Exponential backoff for Bedrock retries |
| RestrictedPython | Sandboxed code execution |

### AWS Services
| Service | Usage |
|---|---|
| **Amazon Bedrock** (Nova Pro `apac.amazon.nova-pro-v1:0`) | LLM for all AI features: repo intelligence, roadmaps, assessments, code analysis, contribution scoring |
| **Amazon DynamoDB** | Primary NoSQL database — users, repos, roadmaps, assessments, chat memory, activity logs, playground sessions |
| **Amazon S3** | Voice recordings, repository ZIPs, profile pictures |
| **Amazon Polly** | Text-to-speech for assessment questions and audio lessons (Kajal voice, en-IN) |
| **Amazon Transcribe** | (Architecture reference — replaced with local Whisper for ap-south-1 availability) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Browser                              │
│                    Next.js 14 Frontend                          │
│         (Zustand · Axios · Monaco · Framer Motion)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST / HTTP (JWT Bearer)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                               │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   Auth   │  │  Repos   │  │ Learning │  │  Assessment  │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │    Routes    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │Playground│  │  Voice   │  │Contribut.│  │  Dashboard   │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │    Routes    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Service Layer                          │   │
│  │  AI Orchestrator · RAG Pipeline · Learning Service      │   │
│  │  Assessment Controller · Repo Controller                │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────┬──────────────┬──────────────┬──────────────┬────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────────┐  ┌───────┐  ┌──────────────┐
│ Amazon   │  │   Amazon     │  │Amazon │  │   FAISS      │
│ Bedrock  │  │  DynamoDB    │  │  S3   │  │ Vector Store │
│Nova Pro  │  │  (8 tables)  │  │       │  │ (local disk) │
└──────────┘  └──────────────┘  └───────┘  └──────────────┘
       │
       ▼
┌──────────────┐
│ Amazon Polly │
│  (Kajal TTS) │
└──────────────┘
```

---

## Project Structure

```
ThenaliAI/
├── Backend/                          # Python 3.11 · FastAPI
│   ├── api/                          # Route handlers
│   │   ├── auth/                     # Register, login, logout
│   │   ├── repos/                    # Upload, analyze, chat, status polling
│   │   ├── learning/                 # Roadmaps, concepts, progress
│   │   ├── assessments/              # Start, answer, voice, results
│   │   ├── playground/               # Code run, analyze, history
│   │   ├── contribution/             # Readiness, profile, repo feed
│   │   ├── dashboard/                # Stats, activity
│   │   ├── voice/                    # Transcribe, TTS
│   │   ├── profile/                  # User profile management
│   │   ├── notifications/            # Activity notifications
│   │   └── tools/                    # Utility endpoints
│   ├── services/
│   │   ├── aws/                      # Bedrock, S3, Polly, Transcribe wrappers
│   │   ├── rag/                      # FAISS RAG pipeline
│   │   ├── learning/                 # Roadmap & concept generation
│   │   ├── evaluation/               # Answer scoring
│   │   ├── embeddings/               # SentenceTransformer embedder
│   │   ├── vector_store/             # FAISS index manager
│   │   ├── ai_orchestrator.py        # Central AI dispatch
│   │   └── whisper_transcriber.py    # Local Whisper STT
│   ├── controllers/                  # Business logic layer
│   ├── models/schemas.py             # Pydantic request/response models
│   ├── database/dynamodb.py          # DynamoDB client + table init
│   ├── prompts/system_prompt.py      # Thenali AI system persona
│   ├── utils/                        # Auth, helpers, LLM cleaner, logger
│   ├── config.py                     # Settings (pydantic-settings)
│   ├── main.py                       # FastAPI app entry point
│   └── requirements.txt
│
├── FrontEnd/                         # Next.js 14 · TypeScript
│   └── src/
│       ├── app/                      # App Router pages
│       │   ├── auth/                 # Login, signup, forgot-password
│       │   ├── dashboard/            # Main dashboard
│       │   ├── learning/             # Roadmap, lesson, setup, recommendation
│       │   ├── evaluation/           # Skill evaluation
│       │   ├── playground/           # Code lab
│       │   ├── repo-analysis/        # Repository intelligence
│       │   ├── contribution/         # Contribution readiness
│       │   ├── profile/              # User profile
│       │   ├── settings/             # App settings
│       │   └── page.tsx              # Landing page
│       ├── components/               # Reusable UI components
│       │   ├── charts/               # Recharts wrappers
│       │   ├── dashboard/            # Dashboard widgets
│       │   ├── learning/             # Lesson, roadmap, quiz components
│       │   ├── repo/                 # Repo analysis UI
│       │   ├── evaluation/           # Assessment UI
│       │   ├── playground/           # Code editor UI
│       │   ├── contribution/         # Contribution UI
│       │   └── ui/                   # Base components (Button, Card, Modal...)
│       ├── hooks/                    # Custom React hooks
│       ├── services/                 # API client + service modules
│       ├── store/                    # Zustand stores
│       ├── context/                  # Language context
│       ├── types/                    # TypeScript type definitions
│       └── styles/                   # Global CSS, theme, tricolor theme
│
├── design.md                         # System architecture & design
├── requirements.md                   # Functional & non-functional requirements
└── README.md                         # This file
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js v18+
- Git (installed and accessible)
- AWS account with access to: Bedrock (Nova Pro), DynamoDB, S3, Polly
- AWS credentials with appropriate IAM permissions

### Backend Setup

```bash
cd Backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your AWS credentials and config
```

Required `.env` variables:
```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
BEDROCK_MODEL_ID=apac.amazon.nova-pro-v1:0
BEDROCK_REGION=ap-south-1
JWT_SECRET_KEY=your_jwt_secret
GIT_PYTHON_GIT_EXECUTABLE=C:\Program Files\Git\bin\git.exe
```

Start the backend:
```bash
# Windows
start.bat

# Linux/Mac (production)
./start_production.sh

# Development
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
cd FrontEnd
npm install
```

Create `FrontEnd/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/repos/upload` | Submit GitHub repo for analysis |
| GET | `/api/repos/status/{repo_id}` | Poll analysis status |
| GET | `/api/repos/intelligence/{repo_id}` | Get full intelligence report |
| POST | `/api/repos/chat` | RAG-based repo Q&A |
| POST | `/api/learning/roadmap` | Generate personalized roadmap |
| POST | `/api/learning/concept` | Get 5-step concept module |
| POST | `/api/learning/concept-chat` | AI tutor Q&A |
| POST | `/api/learning/skill-gap` | Evaluate skill mastery |
| POST | `/api/assessment/start` | Start assessment session |
| POST | `/api/assessment/answer` | Submit answer |
| POST | `/api/assessment/voice/question-audio` | Polly TTS for question |
| POST | `/api/assessment/voice/transcribe-answer` | Whisper STT for answer |
| POST | `/api/playground/run` | Execute Python in sandbox |
| POST | `/api/playground/analyze` | AI code quality analysis |
| POST | `/api/contribution/analyze` | Contribution readiness score |
| POST | `/api/contribution/repo-feed` | Personalized repo recommendations |
| POST | `/api/voice/speak` | Amazon Polly TTS |

---

## Security

- JWT Bearer authentication on all protected endpoints
- bcrypt password hashing with salt
- RestrictedPython sandbox blocks: `os`, `subprocess`, `socket`, `requests`, `urllib`, `pickle`, `ctypes`, `importlib`, `threading`, `multiprocessing`
- Custom HTTP timeout middleware (30s default, 180s for repo analysis, 120s for voice)
- CORS configured per environment
- No PII stored beyond what's necessary for authentication

---

## Team

| Name | Role |
|---|---|
| Saranraj U | Frontend Designer |
| Mohith R | Backend Developer |
| Sabarivasan E | Database Architect |
| Kishore E | DevOps Engineer |

---

## Hackathon Context

Built for the **AI for Bharat by AWS Hackathon**.

This project demonstrates:
- Deep integration with **Amazon Bedrock** (Nova Pro) for generative AI
- Serverless persistence with **Amazon DynamoDB**
- Media accessibility via **Amazon Polly**
- Scalable storage with **Amazon S3**
- A real-world use case: empowering Indian developers to learn faster, understand codebases deeper, and contribute to global open source

> "Thenali AI doesn't just teach you to code — it shows you how to think like an engineer."
