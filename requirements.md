# Requirements Document
## Thenali AI — Bharat AI Operational Hub
### AI for Bharat by AWS Hackathon

---

## 1. Project Overview

Thenali AI is an AI-powered Developer Intelligence Platform built to empower Indian developers. It combines repository analysis, personalized learning, voice-enabled assessments, sandboxed code execution, and open-source contribution readiness into a single, cohesive platform — all powered by AWS.

**Vision:** Every Indian developer, regardless of background or institution, should have access to a world-class AI mentor that understands their codebase, builds their learning path, and guides them to meaningful open-source contribution.

**Hackathon Track:** AI for Bharat by AWS

**Primary AWS Services:** Amazon Bedrock (Nova Pro), Amazon DynamoDB, Amazon S3, Amazon Polly

---

## 2. Stakeholders

| Stakeholder | Role |
|---|---|
| Student Developers | Primary users — learning new technologies |
| Working Developers | Secondary users — upskilling, repo analysis |
| Open Source Maintainers | Indirect beneficiaries — better-prepared contributors |
| Hackathon Judges | Evaluators of technical depth and AWS integration |

---

## 3. Functional Requirements

### 3.1 Authentication & User Management

**FR-AUTH-01:** The system shall allow users to register with a username, email, password, and preferred language.

**FR-AUTH-02:** The system shall authenticate users via email or username + password, returning a JWT access token.

**FR-AUTH-03:** All protected API endpoints shall require a valid JWT Bearer token.

**FR-AUTH-04:** Passwords shall be hashed using bcrypt before storage in DynamoDB.

**FR-AUTH-05:** Users shall have a rank attribute (Novice → Contributor → Senior → Expert) that updates based on platform activity.

**FR-AUTH-06:** Users shall be able to update their profile (username, email, language, avatar).

**FR-AUTH-07:** Avatar images shall be uploaded to Amazon S3 and referenced by URL.

---

### 3.2 Repository Intelligence (RAG Pipeline)

**FR-REPO-01:** Users shall be able to submit a public GitHub repository URL for analysis.

**FR-REPO-02:** The system shall clone the repository to local disk using GitPython.

**FR-REPO-03:** The system shall traverse all source files, filtering out: `node_modules`, `.git`, `__pycache__`, `dist`, `build`, `vendor`, binary files.

**FR-REPO-04:** Supported source file extensions: `.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.java`, `.go`, `.rs`, `.cpp`, `.c`, `.cs`, `.rb`, `.php`, `.swift`, `.kt`, `.scala`.

**FR-REPO-05:** Source files shall be chunked into 512-token segments with 50-token overlap.

**FR-REPO-06:** Chunks shall be embedded using SentenceTransformers (`all-MiniLM-L6-v2`) and stored in a FAISS `IndexFlatL2` index on local disk.

**FR-REPO-07:** Repository analysis status shall be tracked in DynamoDB: `pending → cloning → analyzing → analyzed → error`.

**FR-REPO-08:** The frontend shall poll `GET /api/repos/status/{repo_id}` every 3 seconds until status is `analyzed` or `error`.

**FR-REPO-09:** Upon completion, Amazon Bedrock Nova Pro shall generate a full intelligence report containing:
- Plain-English overview
- Architecture summary
- Complexity score (0–100 float)
- Tech stack list
- Design patterns identified
- Improvement recommendations
- Contribution opportunities
- Security risks
- Strengths
- Mermaid architecture diagram

**FR-REPO-10:** Users shall be able to ask natural language questions about an analyzed repository via a RAG-powered chat interface.

**FR-REPO-11:** RAG chat shall retrieve the top-5 most semantically similar code chunks from FAISS and pass them as context to Bedrock.

**FR-REPO-12:** Chat history shall be persisted in DynamoDB (`bharat_ai_chat_memory` table) per repo per user.

**FR-REPO-13:** Users shall be able to upload a ZIP file of a repository as an alternative to GitHub URL.

**FR-REPO-14:** If a user re-submits the same GitHub URL, the system shall return the existing analyzed result without re-cloning.

**FR-REPO-15:** Repository analysis shall run as a background task — the upload endpoint returns immediately with `repo_id`.

---

### 3.3 Personalized Learning Roadmaps

**FR-LEARN-01:** Users shall be able to generate a personalized learning roadmap by specifying: goal, technology stack, timeline, and current skill level.

**FR-LEARN-02:** Bedrock shall generate a multi-phase roadmap with: title, phases, concepts per phase, projects, milestones, and time estimates.

**FR-LEARN-03:** Roadmaps shall be saved to DynamoDB and retrievable by the user.

**FR-LEARN-04:** Each concept in a roadmap shall support a 5-step learning flow:
1. Sections (structured reading)
2. Code Examples (annotated snippets)
3. Flashcard Quiz (MCQ)
4. Viva Questions (open-ended)
5. Integrity Check (mastery verification)

**FR-LEARN-05:** Progress through each step shall be saved to DynamoDB. Completing a step unlocks the next.

**FR-LEARN-06:** Users shall be able to chat with an AI tutor about any concept via `POST /api/learning/concept-chat`.

**FR-LEARN-07:** The system shall evaluate skill mastery after quiz + viva completion and return a skill gap report with directives.

**FR-LEARN-08:** Users shall be able to view all their roadmaps and their completion status.

**FR-LEARN-09:** The system shall support preset learning plans for common goals (e.g., "Learn React", "Master Python").

**FR-LEARN-10:** Available difficulty levels per topic shall be unlocked progressively based on prior completion.

---

### 3.4 AI-Powered Assessments

**FR-ASSESS-01:** Users shall be able to start an assessment on any topic, optionally tied to an analyzed repository.

**FR-ASSESS-02:** Bedrock shall generate assessment questions dynamically, calibrated to the topic and difficulty level.

**FR-ASSESS-03:** Each answer shall be evaluated by Bedrock and scored: 10 (correct), 5 (partial), 0 (incorrect).

**FR-ASSESS-04:** Final score shall be computed as: `percentage = (total_score / (num_questions × 10)) × 100`.

**FR-ASSESS-05:** Assessment results shall include a skill gap analysis identifying weak areas.

**FR-ASSESS-06:** Assessment sessions shall be persisted in DynamoDB.

**FR-ASSESS-07:** The system shall support voice assessment mode:
- Amazon Polly generates audio for each question
- User records their answer
- Local Whisper model transcribes the audio to text
- Transcribed text is evaluated by Bedrock

**FR-ASSESS-08:** Voice audio files shall be temporarily stored in Amazon S3 and cleaned up after transcription.

**FR-ASSESS-09:** Repository-contextual assessments shall use RAG to generate questions about a specific codebase.

---

### 3.5 Code Lab (Playground)

**FR-PLAY-01:** Users shall be able to write and execute Python code in a browser-based Monaco Editor.

**FR-PLAY-02:** Code shall execute in a RestrictedPython sandbox with the following restrictions:
- Blocked modules: `os`, `subprocess`, `sys`, `shutil`, `socket`, `requests`, `urllib`, `http`, `ftplib`, `smtplib`, `pickle`, `marshal`, `ctypes`, `importlib`, `multiprocessing`, `threading`
- Blocked builtins: `open`, `exec`, `eval`, `__import__`, `compile`

**FR-PLAY-03:** Execution shall have a configurable timeout (default: 10 seconds). Timed-out executions shall return a `SandboxTimeoutError`.

**FR-PLAY-04:** `stdout` and `stderr` shall be captured and returned to the user.

**FR-PLAY-05:** Users shall be able to request AI analysis of their code, receiving: quality score, issues, strengths, complexity rating, and improvement suggestions.

**FR-PLAY-06:** Playground sessions (code + output + analysis) shall be saved to DynamoDB.

**FR-PLAY-07:** Users shall be able to view their playground session history.

---

### 3.6 Voice Operations

**FR-VOICE-01:** Users shall be able to upload audio files for transcription via `POST /api/voice/transcribe`.

**FR-VOICE-02:** Supported audio formats: `webm`, `wav`, `mp4`, `ogg`, `mp3`, `flac`, `application/octet-stream`.

**FR-VOICE-03:** Transcription shall use local OpenAI Whisper (CPU inference) for compatibility with `ap-south-1` region.

**FR-VOICE-04:** Users shall be able to convert text to speech via `POST /api/voice/speak` using Amazon Polly.

**FR-VOICE-05:** Default Polly voice shall be `Kajal` with language code `en-IN`.

**FR-VOICE-06:** Available Polly voices shall be listable via `GET /api/voice/voices`.

**FR-VOICE-07:** Audio responses from Polly shall be returned as `audio/mpeg` binary responses.

---

### 3.7 Contribution Readiness Engine

**FR-CONTRIB-01:** The system shall calculate a Contribution Readiness Score (0–100) based on:
- Repositories analyzed (+20 if > 0)
- Average assessment score (+20 if > 70)
- Roadmaps completed (+15 if > 0)
- Skills evaluated (+15 if > 0)
- Concept mastery entries (+5 each, max 30)

**FR-CONTRIB-02:** Readiness labels shall be: Beginner Contributor (0–29), Growing Contributor (30–59), Active Contributor (60–79), Expert Contributor (80–100).

**FR-CONTRIB-03:** The contribution page shall be locked until the user completes 5 courses OR 5 assessments.

**FR-CONTRIB-04:** Bedrock shall generate 6 personalized open-source repository recommendations matched to the user's skill set, including:
- Matching score (60–99)
- Match reason
- Difficulty level
- Estimated effort
- Contribution areas
- Beginner-friendly issues
- Skill gap mapping

**FR-CONTRIB-05:** The system shall support AI auto-fill of the contribution profile form based on the user's actual activity data.

**FR-CONTRIB-06:** Contribution analysis results shall be cached in DynamoDB for 1 hour to reduce Bedrock calls.

**FR-CONTRIB-07:** The system shall track and display achievements:
- First System Sync (analyze first repo)
- Code Whisperer (pass 5 assessments)
- Master Architect (complete a roadmap)
- Doc Master (analyze 10 repos)
- Community Pillar (reach Expert rank)

---

### 3.8 Dashboard & Analytics

**FR-DASH-01:** The dashboard shall display: repos analyzed, roadmaps created, average assessment score, concept mastery count, and current rank.

**FR-DASH-02:** The dashboard shall show a learning progress tracker with active roadmaps and completion percentages.

**FR-DASH-03:** The dashboard shall display recent activity from the `bharat_ai_activity_logs` table.

**FR-DASH-04:** Skill mastery shall be visualized using Recharts with per-skill progress bars.

**FR-DASH-05:** The dashboard shall show quick action buttons for the most common workflows.

---

### 3.9 Notifications

**FR-NOTIF-01:** The system shall create activity log entries for: repo analysis completion, assessment completion, roadmap milestones.

**FR-NOTIF-02:** A notification bell in the UI shall display unread notification count.

**FR-NOTIF-03:** Users shall be able to mark notifications as read.

---

### 3.10 Multi-Language Support

**FR-LANG-01:** The UI shall support multiple languages via a `LanguageContext` with a `translations.ts` dictionary.

**FR-LANG-02:** Users shall be able to set their preferred language during registration and update it in settings.

**FR-LANG-03:** Amazon Polly shall use `en-IN` as the default language code, supporting Indian English pronunciation.

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-PERF-01:** Standard API reads (dashboard, profile, roadmap list) shall respond within 2 seconds under normal load.

**NFR-PERF-02:** Bedrock LLM calls shall complete within 30 seconds for standard prompts. Repo analysis is exempt (runs as background task).

**NFR-PERF-03:** FAISS similarity search shall return top-5 results within 100ms for indexes up to 10,000 chunks.

**NFR-PERF-04:** Frontend initial page load shall complete within 3 seconds on a standard broadband connection.

**NFR-PERF-05:** Concurrent Bedrock calls shall be capped at 5 via `ThreadPoolExecutor` to prevent AWS throttling.

### 4.2 Scalability

**NFR-SCALE-01:** The FastAPI backend shall support horizontal scaling via multiple Uvicorn workers (`--workers 4`).

**NFR-SCALE-02:** DynamoDB `PAY_PER_REQUEST` billing mode shall auto-scale read/write capacity with zero configuration.

**NFR-SCALE-03:** S3 storage shall scale indefinitely for voice recordings, repository ZIPs, and profile pictures.

**NFR-SCALE-04:** FAISS indexes are stored per `repo_id` on local disk — in a multi-instance deployment, a shared filesystem (EFS) or S3-backed index store would be required.

### 4.3 Reliability

**NFR-REL-01:** Bedrock `ThrottlingException` and `ModelTimeoutException` shall be retried with exponential backoff (Tenacity, max 3 attempts).

**NFR-REL-02:** DynamoDB and S3 initialization failures at startup shall be non-fatal — the app shall log a warning and continue (offline mode support).

**NFR-REL-03:** Repository analysis failures shall update the repo status to `error` in DynamoDB with an error message.

**NFR-REL-04:** All LLM responses shall pass through `clean_llm_output()` / `clean_llm_json()` to handle malformed outputs gracefully.

**NFR-REL-05:** Contribution analysis shall fall back to a calculated score (no Bedrock call) if the AI request fails.

### 4.4 Security

**NFR-SEC-01:** All passwords shall be hashed with bcrypt (minimum 12 rounds).

**NFR-SEC-02:** JWT tokens shall use `HS256` signing with a configurable secret key.

**NFR-SEC-03:** The Python sandbox shall block all filesystem, network, and process operations at the AST level.

**NFR-SEC-04:** CORS shall be restricted to configured origins only.

**NFR-SEC-05:** AWS credentials shall never be exposed in API responses or frontend code.

**NFR-SEC-06:** HTTP timeout middleware shall prevent thread starvation from slow clients (30s default, 180s for repo analysis, 120s for voice).

**NFR-SEC-07:** Audio files uploaded for transcription shall be validated for minimum size (500 bytes) and content type.

### 4.5 Usability

**NFR-USE-01:** The UI shall be fully responsive and usable on desktop and tablet screen sizes.

**NFR-USE-02:** All loading states shall display skeleton screens or animated spinners — no blank pages.

**NFR-USE-03:** Error states shall display human-readable messages with suggested actions.

**NFR-USE-04:** The contribution page unlock gate shall clearly communicate progress (X of 5 courses completed).

**NFR-USE-05:** Repository analysis status shall update in real-time via polling without requiring a page refresh.

### 4.6 Maintainability

**NFR-MAINT-01:** All API routes shall be organized into feature-based modules under `Backend/api/`.

**NFR-MAINT-02:** All AWS service interactions shall be abstracted behind service wrappers in `Backend/services/aws/`.

**NFR-MAINT-03:** Pydantic v2 models shall validate all request and response payloads.

**NFR-MAINT-04:** Structured logging shall be implemented throughout the backend using Python's `logging` module with Rich formatting.

**NFR-MAINT-05:** Environment configuration shall be managed via `pydantic-settings` with `.env` file support.

---

## 5. System Constraints

| Constraint | Detail |
|---|---|
| AWS Region | `ap-south-1` (Mumbai) — primary region for all services |
| Bedrock Model | `apac.amazon.nova-pro-v1:0` — Nova Pro via APAC cross-region inference |
| Polly Voice | `Kajal` (en-IN) — Indian English, female voice |
| Python Version | 3.11+ required for `str | None` union syntax |
| Node.js Version | 18+ required for Next.js 14 |
| Git | Must be installed locally for GitPython to clone repositories |
| FAISS | CPU-only (`faiss-cpu`) — no GPU required |
| Whisper | CPU inference — no GPU required, but slower on large audio files |
| DynamoDB | All tables use `PAY_PER_REQUEST` — no provisioned capacity needed |

---

## 6. External Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `fastapi` | ≥0.100.0 | REST API framework |
| `boto3` | ≥1.28.0 | AWS SDK |
| `faiss-cpu` | ≥1.7.4 | Vector similarity search |
| `sentence-transformers` | ≥2.2.0 | Code embeddings |
| `gitpython` | ≥3.1.30 | Repository cloning |
| `openai-whisper` | ≥20231117 | Local speech-to-text |
| `tenacity` | ≥8.0.0 | Retry logic |
| `pydantic` | ≥2.0.0 | Data validation |
| `python-jose` | ≥3.3.0 | JWT handling |
| `passlib[bcrypt]` | ≥1.7.4 | Password hashing |
| `next` | latest | Frontend framework |
| `zustand` | ≥5.0.0 | State management |
| `framer-motion` | ≥12.0.0 | Animations |
| `@monaco-editor/react` | ≥4.7.0 | Code editor |
| `recharts` | ≥3.0.0 | Data visualization |
| `reactflow` | ≥11.0.0 | Flow diagrams |

---

## 7. Acceptance Criteria

### Repository Intelligence
- [ ] User can submit a GitHub URL and receive a full intelligence report within 3 minutes
- [ ] Intelligence report contains all 10 required fields (overview, architecture, complexity, tech stack, patterns, recommendations, opportunities, risks, strengths, diagram)
- [ ] RAG chat returns contextually relevant answers about the codebase
- [ ] Status polling updates correctly through all states

### Learning
- [ ] Roadmap generation produces at least 3 phases with concepts, projects, and milestones
- [ ] 5-step concept flow completes and saves progress correctly
- [ ] Skill gap report identifies specific weak areas after assessment

### Assessment
- [ ] Text assessment generates 5+ questions and scores answers correctly
- [ ] Voice assessment: Polly audio plays, Whisper transcribes, Bedrock scores
- [ ] Score percentage never exceeds 100%

### Playground
- [ ] Python code executes and returns output within 10 seconds
- [ ] Blocked modules (`os`, `subprocess`, etc.) raise `ImportError`
- [ ] AI analysis returns quality score and actionable suggestions

### Contribution
- [ ] Readiness score calculates correctly from user activity data
- [ ] Contribution page is locked until 5 courses or 5 assessments completed
- [ ] 6 personalized repo recommendations generated with full metadata

### Security
- [ ] Unauthenticated requests to protected endpoints return 401
- [ ] Sandbox blocks `import os`, `import subprocess`, `open()`, `eval()`
- [ ] Passwords are not stored in plaintext

---

## 8. Out of Scope (v1.0)

- Real-time GitHub issue fetching (contribution recommendations are AI-generated, not live API calls)
- Multi-language code execution in playground (Python only)
- Team/organization accounts
- Mobile native app (web responsive only)
- Real-time collaborative features (WebSocket)
- AWS Transcribe (replaced with local Whisper for ap-south-1 availability)
- GPU-accelerated Whisper inference
- Shared FAISS indexes across multiple backend instances
