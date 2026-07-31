# 🍋 LeMonaide — ML Aide, one console for the whole ML lifecycle

> Data ingestion → dataset versioning → model building (classical ML + deep learning) → comparison & inference testing → production shipping — with a reasoning agent that guides you, not a chatbot that answers FAQs.

---

## 1. The problem

Every team building ML today stitches together 4–6 tools to cover one lifecycle:

- **Dataset versioning** → DVC / lakeFS
- **Experiment tracking** → MLflow / W&B / Neptune
- **Training infra / orchestration** → Kubeflow / SageMaker / Vertex AI
- **Model registry & serving** → BentoML / Seldon / KServe
- **Monitoring & drift** → Arize / WhyLabs / Fiddler

No single tool covers the full lifecycle — teams are forced to assemble multi-tool pipelines, and "reproducing a result from last quarter means archaeology through Slack and old commits." Fully managed platforms (Vertex AI, SageMaker, Databricks) solve the fragmentation but introduce cloud lock-in and real cost — a production Kubeflow cluster alone commonly runs $1,000–5,000/month before engineering time is counted, and managed platforms build in the same overhead behind a subscription.

Meanwhile, "table stakes" have shifted: experiment tracking, registries, and drift detection no longer differentiate a platform — everyone has them. And most AI copilots bolted onto ML tools today are RAG-over-docs chatbots — useful, but they don't reason about *your* experiments, they just answer questions about documentation.

## 2. What LeMonaide is

A **locally-hostable, single-console ML/DL/MLOps platform** that takes a project from raw dataset to production-shippable model, wrapping proven open-source engines (MLflow, DVC) under one coherent UI/API instead of reinventing them — and adding one thing nobody else does well:

### 🧠 The Hypothesis-Driven Ablation Agent

Instead of brute-force hyperparameter search (traditional AutoML) or a static leaderboard of past runs (traditional experiment tracking), LeMonaide's agent:

1. **Reasons** over your dataset's characteristics + a RAG knowledge base of ML/DL best practices (sklearn, PyTorch, XGBoost, DVC, MLOps docs) to generate a *small number of targeted hypotheses* about what's limiting model performance (e.g. "F1 looks capped by class imbalance, not model capacity — try class weighting before adding depth").
2. **Runs** minimal, controlled ablation experiments to test each hypothesis — changing one variable at a time (feature, preprocessing step, hyperparameter).
3. **Builds** a persistent, per-project **Decision Provenance Graph** — a causal map of *which factor caused which performance delta*, that compounds across every experiment the team has ever run on that dataset. This is institutional memory, not a flat run list that loses meaning as soon as someone new opens the project.

**Why this matters (the cost story):** instead of paying compute for 200 blind grid-search runs, you pay for ~10–20 reasoned ones — and you walk away with an *explanation*, not just a checkpoint file.

## 3. Core pillars

| Pillar | What it does |
|---|---|
| **Dataset Hub** | Ingest, version (DVC under the hood), profile, and diff datasets. Auto-generated data quality/schema cards. |
| **Model Studio** | Build classical ML (scikit-learn, XGBoost, LightGBM) and deep learning (PyTorch) models with a parameter-tuning UI. |
| **Ablation Agent** | LangGraph-orchestrated agent that proposes, runs, and explains targeted experiments (see §2). |
| **Compare & Ship** | Side-by-side inference comparison across models/datasets, one-click promotion to a served endpoint. |
| **Knowledge Copilot** | RAG assistant over ML/DL/MLOps documentation for in-context guidance (secondary to the Ablation Agent, not the headline feature). |
| **Local-First Deploy** | Full stack runs via Docker Compose — genuinely self-hostable, not just "self-hosted UI in front of someone else's cloud." |

## 4. Architecture (high level)

```
┌─────────────────────────────────────────────────────────────┐
│                        React (Vite) Frontend                  │
│   Dataset Hub · Model Studio · Provenance Graph (react-flow)  │
└───────────────────────────┬────────────────────────────────┘
                             │ REST / WS
┌───────────────────────────▼────────────────────────────────┐
│                        FastAPI Backend                        │
│  ┌───────────┐ ┌──────────────┐ ┌───────────────────────┐    │
│  │  Auth /   │ │  Training     │ │  Ablation Agent        │    │
│  │  Projects │ │  Orchestrator │ │  (LangGraph + RAG)     │    │
│  └───────────┘ └──────┬───────┘ └──────────┬────────────┘    │
│         │              │                     │                │
│  ┌──────▼──────┐ ┌────▼─────┐  ┌───────────▼───────────┐    │
│  │  Supabase   │ │  MLflow   │  │  Qdrant / pgvector      │    │
│  │  (Postgres) │ │  (runs)   │  │  (docs embeddings)      │    │
│  └─────────────┘ └───────────┘  └─────────────────────────┘    │
│         │              │                                       │
│  ┌──────▼──────────────▼───────┐    ┌─────────────────────┐   │
│  │  DVC-backed dataset storage │    │  Celery + Redis       │   │
│  │  (local disk / S3-compat)   │    │  (background jobs)    │   │
│  └──────────────────────────────┘    └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 5. Tech stack

- **Frontend:** React + Vite, Tailwind, shadcn/ui, Recharts/Plotly (metrics), react-flow (Decision Provenance Graph)
- **Backend:** FastAPI, Celery + Redis (background ablation jobs)
- **Database:** Supabase (Postgres) — users, projects, metadata
- **Experiment tracking:** MLflow (self-hosted, wrapped by our UI — not rebuilt)
- **Dataset versioning:** DVC (git-native, local-first)
- **ML/DL libraries:** scikit-learn, XGBoost, LightGBM, PyTorch
- **Agent orchestration:** LangGraph (stateful, HITL-capable)
- **Vector store:** pgvector (via Supabase) or Qdrant for docs RAG
- **LLM:** RAG over a hosted or local model (Ollama-served 14B class model as a fallback) — fine-tuning is a v2 roadmap item, not MVP scope
- **Deployment:** Docker Compose (genuinely local-first)

## 6. Productivity & cost narrative (for pitching)

- **Fewer tools, fewer context switches:** one login, one console, instead of DVC + MLflow + a separate serving tool + a separate copilot.
- **Reasoned experimentation over brute force:** ~10–20 targeted ablations vs. 100s of blind grid-search runs → lower compute spend, faster time-to-insight.
- **Institutional memory that compounds:** the Decision Provenance Graph means a new team member (or a senior manager auditing model sprawl) can see *why* a model looks the way it does, not just its final metrics — directly addressing the "247 undocumented production models" failure mode enterprises report today.
- **Local-first:** no mandatory cloud spend, no data residency concerns — genuinely relevant for regulated or cost-sensitive teams, not just a slide bullet.

## 7. MVP scope for the hackathon (realistic cut)

- [ ] Dataset upload + DVC versioning + auto profiling
- [ ] Model Studio: train 2–3 sklearn/XGBoost models + 1 PyTorch model on a demo dataset
- [ ] MLflow-backed run tracking, surfaced in custom UI
- [ ] Ablation Agent: hardcode 3–4 hypothesis templates, run them live, render the Decision Provenance Graph (this is the demo centerpiece)
- [ ] Compare & Ship: side-by-side inference view + "promote to production" toggle
- [ ] Docker Compose for one-command local spin-up

**Explicitly out of scope for MVP:** actual LLM fine-tuning, multi-cloud deployment, full drift monitoring, feature store.

## 8. Roadmap (post-hackathon)

- v2: Fine-tune a small open model on ML/DL/DVC/MLOps docs instead of pure RAG
- v3: Team collaboration, model registry governance, drift monitoring
- v4: One-click cloud deploy target (in addition to local) for teams that outgrow local hosting

---

*Sources reviewed while researching the competitive landscape (MLflow, DVC, Kubeflow, Vertex AI, SageMaker, ClearML, H2O.ai, LangGraph-based agentic RAG patterns) are summarized in the accompanying research notes — ping if you want the full list re-attached.*
