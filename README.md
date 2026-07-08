# Wild AgentOS Admin Console

<div align="center">
<img src="public/logo_transparent.png" width="120" alt="Wild AgentOS Logo" />

**The Industrial-Grade AI Agent OS Web Management Console**

[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-cyan.svg)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## 🖥️ Overview

`Wild_AgentOS_Admin` is the official administrative web dashboard for Wild AgentOS. It provides developers and administrators with a visual control panel to define agents, register skills, manage knowledge bases, trace execution flows in real-time, and govern multi-tenant credentials.

### Key Visual Features
- **Agent No-Code Constructor**: Form-driven creation, customization, and capability slot mounts for agents.
- **Unified Model Registry Center**: Manage LLMs, Vision-Language (VL) models, and hot-swap active embedding servers with live connections.
- **Skill Center CRUD**: Inspect detailed skill input/output JSON schemas, configure templates, and verify Ed25519 digital signatures.
- **Knowledge Ingestion Panel**: Two-phase knowledge uploads for both vector bases and graph databases.
- **API Key & Client Governance**: Configure caller scopes, assign rate limits, monitor token metrics, and inspect structural audit trails.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- Local or remote running [Wild AgentOS Daemon](https://github.com/skaiy/Wild_AgentOS) (port `:8080` / gRPC `:50051`)

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env` or `.env.local`:
   ```env
   VITE_API_URL=http://localhost:8080
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Access the web interface at `http://localhost:3000`.

---

## 🎉 Release History & Changelog

We maintain our independent release timeline of **Wild AgentOS**, fusing our custom mid-platform security/gateway features with the upstream cognitive upgrades (v0.1.3).

| Version | Release Date | Key Upgrades & Fused Features |
|---------|--------------|------------------------------|
| **v1.5** | **2026-07-08** | **Cognitive Causal Engine & Advanced Graph Governance**<br>• **Causal Engine**: Standalone causal reasoning subsystem (`CausalEngine`, `FusionEngine`, `CausalStore`) to trace root causes and compute causal graphs of agent decisions.<br>• **Unified Graph Backend**: Consolidated fragmented graph operations into a single high-performance `GraphBackend`.<br>• **Graph Features**: Structural feature computation (PageRank, PageRank vector, centrality) and similarity scoring between cognitive snapshots.<br>• **Snapshot Timeline**: Temporal snapshot versioning with diff-based rollback and point-in-time state restoration.<br>• **Skill Center CRUD & Guard**: New client-side skill editing/deletion support, detail schema rendering, and strict **403 Forbidden** guards protecting system-level (`iri://`) builtins. |
| **v1.4** | **2026-07-06** | **Model Registry Center (3-in-1 Consolidation) & Dynamic Ingestion**<br>• **Consolidated Model Registry**: Merged gateway, embedding, and resource mapping settings into a unified "Model Registry Center".<br>• **Auto Model Discovery**: Automatic endpoint model schema discovery (`/v1/models`) and keyword-matching modaly pre-evaluation.<br>• **Vector Service Bridge**: Dynamic hot-swapping embedding models, triggering zero-downtime database rebuilds and background indexing. |
| **v1.3** | **2026-07-06** | **Multi-Modal Vision-Language (VL) Routing & Capability Slots**<br>• **Multi-Modal Gateway**: Automatic payload extraction (`ChatContent` parts) routing image payloads (Base64/URL) to VL models.<br>• **Agent Capability Slots**: Multi-model slot assignments per agent (e.g. Chat Slot → DeepSeek-V4, Vision Slot → Gemini-Pro). |
| **v1.2** | **2026-07-05** | **Multi-Tenant Knowledge Ingestion & Unified Knowledge Packages**<br>• **Two-Phase Ingestion**: Concurrent multi-file chunking upload to vector databases, and structural CSV/N-Triples graph imports to tenant-isolated named graphs.<br>• **Knowledge Package Mounting**: Decoupled individual graph path binding, unifying knowledge resources into multi-pack `knowledge_pack_ids` for structured routing. |
| **v1.1** | **2026-07-04** | **API Key Governance Center & One-Click Publishing**<br>• **API Key Governance**: Real-time client credentials management, quota limits enforcement, security audit logs, and access scopes.<br>• **OpenAI-Compatible Gateway**: One-click agent publishing with compatible endpoints (`/v1/chat/completions`) and SSE stream routes. |
| **v1.0** | **2026-07-01** | **Initial Release — Core OS Engine & Hyperspace Vector Storage (v0.1.2)**<br>• **HyperspaceEngine**: Embedded HNSW vector database with WAL and Poincaré/Lorentz metrics.<br>• **Skill Graph & Blackboard**: 5W2H semantic skill hypergraph, L0-L3 memory cache hierarchy with MESI coherence.<br>• **Workspace Monitor**: Real-time file system triggers and proactive perception engine. |
