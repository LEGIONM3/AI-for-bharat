# System Architecture & Design Document
## Thenali AI — Bharat AI Operational Hub
### AI for Bharat by AWS Hackathon

---

## 1. Executive Summary

Thenali AI is a decoupled, cloud-native developer intelligence platform. The frontend is a Next.js 14 single-page application communicating with a FastAPI backend over REST. All AI capabilities are powered by Amazon Bedrock (Nova Pro). Persistence is handled by Amazon DynamoDB. Binary assets (voice, repos, avatars) are stored in Amazon S3. Local FAISS vector indexes enable fast semantic search over cloned repositories.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                    │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                  Next.js 14 (App Router)                        │   │
│   │                                                                 │   │
│   │  Pages: Landing · Dashboard · Learning · Repo Analysis          │   │
│   │         Evaluation · Playground · Contribution · Profile        │   │
│   │                                                                 │   │
│   │  State: Zustand stores (user, learning, repo, ui)               │   │
│   │  HTTP:  Axios with JWT interceptor + 401 redirect               │   │
│   │  UI:    Tailwind CSS · Framer Motion · Glassmorphism            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTPS REST (JWT Bearer Token)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API TIER                                       │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │              FastAPI + Uvicorn (Python 3.11)                    │   │
│   │                                                                 │   │
│   │  Middleware: CORS · GZip · Timeout (30s/180s/120s per route)   │   │
│   │  Auth:       JWT Bearer · bcrypt · Passlib                     │   │
│   │                                                                 │   │
│   │  Route Modules:                                                 │   │
│   │  /api/auth        /api/repos       /api/learning               │   │
│   │  /api/assessment  /api/playground  /api/contribution           │   │
│   │  /api/voice       /api/dashboard   /api/profile                │   │
│   │  /api/notifications                                             │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     Service Layer                               │   │
│   │                                                                 │   │
│   │  AI Orchestrator ──► Bedrock Runtime (ThreadPoolExecutor x5)   │   │
│   │  RAG Pipeline    ──► GitPython → Chunker → Embedder → FAISS    │   │
│   │  Learning Service──► Roadmap Gen · Concept Gen · Progress      │   │
│   │  Eval Service    ──► Answer Scoring · Skill Gap Analysis       │   │
│   │  Whisper STT     ──► Local CPU inference (openai-whisper)      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└──────┬──────────────┬──────────────┬──────────────┬──────────────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────────────────┐
│  Amazon    │ │  Amazon    │ │ Amazon   │ │   Local Disk             │
│  Bedrock   │ │  DynamoDB  │ │   S3     │ │   FAISS Vector Indexes   │
│  Nova Pro  │ │  8 Tables  │ │ 3 Buckets│ │   (per repo_id)          │
└────────────┘ └────────────┘ └──────────┘ └──────────────────────────┘
       │
       ▼
┌────────────┐
│  Amazon    │
│   Polly    │
│ (Kajal TTS)│
└────────────┘
```

---

## 3. Component Design

### 3.1 RAG Pipeline (`services/rag/pipeline.py`)

The RAG (Retrieval-Augmented Generation) pipeline is the core of the repository intelligence feature.

**Flow:**
```
GitHub URL
    │
    ▼
GitPython clone ──► Local disk (./data/repos/{repo_id}/)
    │
    ▼
File traversal ──► Filter: skip node_modules, .git, __pycache__, dist, build
    │
    ▼
Language detection ──► .py .js .ts .tsx .java .go .rs .cpp .c .cs .rb .php
    │
    ▼
Semantic chunking ──► 512-token chunks with 50-token overlap
    │
    ▼
SentenceTransformers ──► all-MiniLM-L6-v2 embeddings (384-dim vectors)
    │
    ▼
FAISS IndexFlatL2 ──► Saved to ./data/faiss_indexes/{repo_id}.index
    │
    ▼
DynamoDB ──► repo status: pending → cloning → analyzing → analyzed
```

**Thread Safety:** `threading.Lock()` wraps all FAISS write operations to prevent segmentation faults under multi-worker Uvicorn.

**Query Flow (RAG Chat):**
```
User question
    │
    ▼
Embed question ──► SentenceTransformers
    │
    ▼
FAISS search ──► Top-K most similar code chunks (k=5)
    │
    ▼
Context assembly ──► Concatenate retrieved chunks
    │
    ▼
Bedrock Nova Pro ──► Answer with code context
    │
    ▼
Response to user
```

### 3.2 Bedrock Runtime (`services/aws/bedrock_runtime.py`)

**Key design decisions:**
- `ThreadPoolExecutor(max_workers=5)` — caps concurrent Bedrock calls at 5, preventing AWS throttling
- `tenacity` retry with exponential backoff — handles `ThrottlingException` and `ModelTimeoutException`
- Nova Pro payload format: `system` is a top-level list of `{text: ...}` objects, NOT inside `messages[]`
- `clean_llm_output()` / `clean_llm_json()` — strips markdown fences, JSON wrappers, and stray artifacts from all LLM responses
- Two invocation modes:
  - `invoke_model(prompt) → str` — plain text response
  - `invoke_model_structured(prompt) → dict | list` — parsed JSON response

**Payload structure (Nova Pro):**
```json
{
  "system": [{"text": "You are Thenali AI..."}],
  "messages": [
    {"role": "user", "content": [{"text": "..."}]},
    {"role": "assistant", "content": [{"text": "..."}]}
  ],
  "inferenceConfig": {
    "maxTokens": 1500,
    "temperature": 0.4
  }
}
```

### 3.3 Learning Service (`services/learning/learning_service.py`)

Generates structured learning roadmaps and concept modules via Bedrock.

**Roadmap schema:**
```json
{
  "roadmap_id": "uuid",
  "title": "...",
  "goal": "...",
  "stack": ["Python", "FastAPI"],
  "timeline": "8 weeks",
  "total_weeks": 8,
  "phases": [
    {
      "phase": 1,
      "title": "...",
      "duration": "2 weeks",
      "concepts": ["concept1", "concept2"],
      "projects": ["project1"],
      "milestones": ["milestone1"]
    }
  ]
}
```

**5-Step Concept Learning Flow:**
1. **Sections** — structured reading content with explanations
2. **Code Examples** — annotated, runnable code snippets
3. **Flashcard Quiz** — MCQ questions with instant feedback
4. **Viva Questions** — open-ended verbal/written questions
5. **Integrity Check** — final mastery verification

### 3.4 Assessment Controller (`controllers/assessment_controller.py`)

- Questions generated by Bedrock, calibrated to topic and difficulty
- Scoring: 10 (correct) / 5 (partial) / 0 (incorrect) per question
- `max_score = num_questions × 10`
- `percentage = (total_score / max_score) × 100`
- Skill gap analysis: identifies weak areas from wrong/partial answers
- Voice mode: Polly generates audio per question → Whisper transcribes answer

### 3.5 Playground Sandbox (`api/playground/routes.py`)

**Blocked modules:** `os`, `subprocess`, `sys`, `shutil`, `socket`, `requests`, `urllib`, `http`, `ftplib`, `smtplib`, `pickle`, `marshal`, `ctypes`, `importlib`, `multiprocessing`, `threading`

**Blocked builtins:** `open`, `exec`, `eval`, `__import__`, `compile`

**Allowed builtins:** `print`, `range`, `len`, `str`, `int`, `float`, `bool`, `list`, `dict`, `tuple`, `set`, `type`, `isinstance`, `enumerate`, `zip`, `map`, `filter`, `sorted`, `reversed`, `min`, `max`, `sum`, `abs`, `round`, `pow`, `divmod`, `any`, `all`, `repr`, `format`

Execution runs in a separate thread with configurable timeout. `stdout` and `stderr` are captured via `io.StringIO`.

### 3.6 Contribution Engine (`api/contribution/routes.py`)

**Readiness Score Formula:**
```
score = 0
if repos_analyzed > 0:     score += 20
if avg_assessment > 70:    score += 20
if roadmaps_completed > 0: score += 15
if skills_evaluated > 0:   score += 15
score += min(30, len(concept_mastery) * 5)
```

**Labels:**
- 0–29: Beginner Contributor
- 30–59: Growing Contributor
- 60–79: Active Contributor
- 80–100: Expert Contributor

**Unlock Gate:** Contribution page requires 5+ completed courses OR 5+ assessments — enforces genuine engagement before surfacing contribution opportunities.

---

## 4. Database Design (DynamoDB)

All tables use `PAY_PER_REQUEST` billing mode (serverless, auto-scaling).

### Table: `bharat_ai_users`
| Attribute | Type | Description |
|---|---|---|
| `user_id` | String (PK) | UUID |
| `email` | String | Unique email |
| `username` | String | Display name |
| `password_hash` | String | bcrypt hash |
| `language` | String | Preferred UI language |
| `rank` | String | Novice/Contributor/Senior/Expert |
| `concept_mastery` | List | Completed concept IDs |
| `total_repos` | Number | Repos analyzed count |
| `total_roadmaps` | Number | Roadmaps created count |
| `avg_assessment_score` | Number | Rolling average score |
| `contribution_cache` | Map | Cached contribution analysis |
| `repo_feed_cache` | Map | Cached repo recommendations |

### Table: `bharat_ai_repositories`
| Attribute | Type | Description |
|---|---|---|
| `repo_id` | String (PK) | UUID |
| `user_id` | String | Owner |
| `repo_url` | String | GitHub URL |
| `repo_name` | String | Display name |
| `status` | String | pending/cloning/analyzing/analyzed/error |
| `tech_stack` | List | Detected technologies |
| `files_count` | Number | Total files parsed |
| `created_at` | String | ISO timestamp |

### Table: `bharat_ai_repo_intelligence`
| Attribute | Type | Description |
|---|---|---|
| `repo_id` | String (PK) | Matches repos table |
| `overview` | String | Plain-English description |
| `architecture_summary` | String | Architecture explanation |
| `complexity_score` | Number | 0–100 float |
| `tech_stack` | List | Technologies detected |
| `design_patterns` | List | Patterns identified |
| `recommendations` | List | Improvement suggestions |
| `contribution_opportunities` | List | Where to contribute |
| `risks` | List | Security/tech debt risks |
| `strengths` | List | What the repo does well |
| `mermaid_diagram` | String | Architecture diagram code |
| `generated_at` | String | ISO timestamp |

### Table: `bharat_ai_roadmaps`
| Attribute | Type | Description |
|---|---|---|
| `id` | String (PK) | UUID |
| `user_id` | String | Owner |
| `goal` | String | Learning goal |
| `stack` | List | Technology stack |
| `timeline` | String | Duration |
| `phases` | List | Phase objects with concepts/projects |
| `status` | String | active/completed |
| `created_at` | String | ISO timestamp |

### Table: `bharat_ai_assessments`
| Attribute | Type | Description |
|---|---|---|
| `assessment_id` | String (PK) | UUID |
| `user_id` | String | Owner |
| `topic` | String | Assessment subject |
| `repo_id` | String (optional) | For repo-contextual assessments |
| `questions` | List | Generated questions |
| `answers` | List | User answers with scores |
| `total_score` | Number | Sum of answer scores |
| `percentage` | Number | 0–100 |
| `status` | String | in_progress/completed |

### Table: `bharat_ai_chat_memory`
| Attribute | Type | Description |
|---|---|---|
| `repo_id` | String (PK) | Repository context |
| `message_id` | String (SK) | UUID |
| `user_id` | String | Owner |
| `role` | String | user/assistant |
| `message` | String | Message content |
| `timestamp` | String | ISO timestamp |

### Table: `bharat_ai_activity_logs`
| Attribute | Type | Description |
|---|---|---|
| `log_id` | String (PK) | UUID |
| `user_id` | String | Owner |
| `type` | String | analysis_complete/assessment_done/etc |
| `message` | String | Human-readable notification |
| `read` | Boolean | Read status |
| `created_at` | String | ISO timestamp |

### Table: `bharat_ai_playground_sessions`
| Attribute | Type | Description |
|---|---|---|
| `id` | String (PK) | UUID |
| `user_id` | String | Owner |
| `code` | String | Submitted code |
| `language` | String | Programming language |
| `output` | String | Execution output |
| `analysis_score` | Number | AI quality score |
| `created_at` | String | ISO timestamp |

---

## 5. API Design

### Authentication Flow
```
POST /api/auth/signup
  Body: { username, email, password, language }
  Returns: { access_token, token_type, user_id, username, rank }

POST /api/auth/login
  Body: { identifier (email or username), password }
  Returns: { access_token, token_type, user_id, username, rank }

All protected endpoints:
  Header: Authorization: Bearer <access_token>
  Backend: JWT decode → user_id (sub claim) → DynamoDB lookup
```

### Repository Analysis Flow
```
1. POST /api/repos/upload
   Body: { repo_url, repo_name? }
   Returns: { repo_id, status: "pending" }

2. Background task starts:
   Clone → Parse → Embed → Bedrock analyze → DynamoDB save

3. GET /api/repos/status/{repo_id}   (poll every 3s)
   Returns: { repo_id, status }

4. GET /api/repos/intelligence/{repo_id}
   Returns: full intelligence report (flat merged response)

5. POST /api/repos/chat
   Body: { repo_id, message, session_id? }
   Returns: { response, sources }
```

### Learning Flow
```
1. POST /api/learning/roadmap
   Body: { goal, stack[], timeline, current_level }
   Returns: { roadmap_id, title, phases[] }

2. POST /api/learning/concept
   Body: { topic, roadmap_id, lesson_id? }
   Returns: { sections[], code_examples[], quiz[], viva[], integrity[] }

3. POST /api/learning/concept-progress
   Body: { roadmap_id, concept_id, step, score }
   Returns: { next_unlocked, progress_pct }

4. POST /api/learning/skill-gap
   Body: { topic, quiz_score, viva_score }
   Returns: { mastery_level, gaps[], directives[] }
```

---

## 6. Frontend Architecture

### State Management (Zustand)

```
userStore       → { user, token, login(), logout(), updateProfile() }
learningStore   → { roadmaps, currentRoadmap, progress, setRoadmap() }
repoStore       → { repos, currentRepo, intelligence, setRepo() }
uiStore         → { loading, modals, notifications, theme }
```

### Routing (Next.js App Router)

```
/                           → Landing page
/auth/login                 → Login
/auth/signup                → Register
/auth/forgot-password       → Password reset
/dashboard                  → Main dashboard
/learning/setup             → Roadmap creation wizard
/learning/dashboard         → Learning overview
/learning/roadmap/[id]      → Roadmap detail
/learning/lesson            → Active lesson (5-step flow)
/learning/recommendation/[id] → AI recommendation detail
/evaluation                 → Skill evaluation
/playground                 → Code lab
/repo-analysis              → Repository intelligence
/contribution               → Contribution readiness
/profile                    → User profile
/settings                   → App settings
/changelog                  → Version history
/news                       → Tech news
/privacy                    → Privacy policy
/terms                      → Terms of service
/security                   → Security policy
```

### HTTP Client (Axios)

```typescript
// Auto-attach JWT to every request
apiClient.interceptors.request.use(config => {
  const token = userStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-redirect on 401
apiClient.interceptors.response.use(null, error => {
  if (error.response?.status === 401) router.push('/auth/login');
  return Promise.reject(error);
});
```

---

## 7. UI/UX Design System

### Color Palette
| Token | Value | Usage |
|---|---|---|
| `saffron` | `#FF9933` | Primary accent, CTAs, highlights |
| `green-bharat` | `#138808` | Success states, progress |
| `navy` | `#000080` | Deep backgrounds |
| `background` | `#09090b` | Main background |
| `surface` | `rgba(255,255,255,0.05)` | Card backgrounds |
| `border` | `rgba(255,255,255,0.08)` | Card borders |

The tricolor theme (saffron, white, green) is a deliberate nod to the Indian national flag — reinforcing the "AI for Bharat" identity throughout the UI.

### Design Language
- **Glassmorphism** — `backdrop-blur`, semi-transparent surfaces, soft glow borders
- **Dark mode first** — `#09090b` base, white text at varying opacities
- **Typography** — Inter (UI), Outfit (headings), JetBrains Mono (code)
- **Motion** — Framer Motion for page transitions, card reveals, loading states
- **Cyberpunk-India fusion** — neon gradients meet saffron/green accents

### Component Library
- `Button` — variants: primary, saffron, ghost, danger
- `Card` — glassmorphic surface with optional glow
- `Input` — dark themed with focus ring
- `Modal` — backdrop blur overlay
- `Loader` — animated spinner with brand colors
- `ProgressBar` — saffron fill with smooth transitions
- `Skeleton` — shimmer loading states

---

## 8. Security Architecture

### Authentication
- JWT tokens signed with `HS256`, configurable expiry (default 1440 min / 24h)
- `sub` claim carries `user_id` — all data access scoped to this ID
- Passwords hashed with bcrypt (12 rounds salt)

### API Security
- All routes except `/api/auth/*` require valid JWT
- `get_current_user` dependency injected via FastAPI `Depends()`
- CORS restricted to configured origins

### Sandbox Security
- RestrictedPython AST transformation blocks dangerous operations at parse time
- Module import whitelist — only safe stdlib modules allowed
- Execution timeout enforced via threading with `Event` signaling
- `stdout`/`stderr` captured — no terminal access

### Middleware
```python
# Timeout middleware — prevents thread starvation
TimeoutMiddleware(app, timeout=30)   # default
TimeoutMiddleware(app, timeout=180)  # repo analysis routes
TimeoutMiddleware(app, timeout=120)  # voice routes
```

---

## 9. Deployment Architecture

### Backend (Production)
```bash
# start_production.sh
uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --loop uvloop \
  --http httptools \
  --log-level info
```

### Frontend (Production)
```bash
npm run build
npm run start
# or deploy to Vercel/AWS Amplify
```

### AWS Infrastructure
```
Region: ap-south-1 (Mumbai)

DynamoDB:
  - 8 tables, PAY_PER_REQUEST billing
  - Auto-created on backend startup via create_tables_if_not_exist()

S3 Buckets:
  - bharat-ai-voice-recordings
  - bharat-ai-repositories
  - bharat-ai-profile-pictures
  - Auto-created on backend startup via s3_service.ensure_bucket_exists()

Bedrock:
  - Model: apac.amazon.nova-pro-v1:0
  - Region: ap-south-1
  - Max concurrent calls: 5 (ThreadPoolExecutor)

Polly:
  - Voice: Kajal (en-IN)
  - Output: MP3
  - Max text: 3000 chars per request
```

---

## 10. Performance & Scalability

| Concern | Solution |
|---|---|
| Bedrock throttling | Tenacity exponential backoff, max 5 concurrent calls |
| Long repo analysis | Background tasks + status polling (no request timeout) |
| FAISS thread safety | `threading.Lock()` on all index writes |
| DynamoDB connection | Thread-local boto3 sessions (no shared state) |
| LLM response parsing | `clean_llm_output()` strips all artifacts before JSON parse |
| Frontend re-renders | Zustand selectors, React.memo on heavy components |
| Large codebases | File size limits, skip binary files, max chunk count |
| Voice file size | 500-byte minimum check, content-type validation |
