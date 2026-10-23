# Corporate Document Repository (POC)

A secure, scalable, and user-friendly Document Repository Proof of Concept (POC) where employees can upload, store, version, and search corporate documents (such as policies, reports, and technical documentation).

---

## Deliverable 1: System Architecture & Design Choices

### 1. High-Level System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client ["Client Layer"]
        Browser["User Browser / Client App"]
    end

    subgraph FrontendApp ["Frontend (Next.js App Router)"]
        UI["Next.js Web UI\n(Upload, Search, Detail Pages)"]
        ClientAPI["API Client / Server Actions"]
    end

    subgraph BackendAPI ["Backend Layer (Node.js REST API)"]
        Router["Express Router & Route Handlers"]
        Middleware["Middlewares\n(Multer, Validation, Auth & RBAC, Error Handling)"]
        Controller["Controllers\n(HTTP Request / Response)"]
        Service["Services\n(Business Logic, Versioning Rules, Access Validation)"]
        Repository["Repositories / Data Access Layer"]
    end

    subgraph Caching ["Cache Layer"]
        Redis[("Redis Cache\n- Search Query Cache\n- Session/Access Tokens")]
    end

    subgraph Storage ["Persistence Layer"]
        Postgres[("PostgreSQL Database\n- Users & Departments\n- Documents & Versions\n- Tags & Permissions")]
        FileStorage[("Document Storage\n(Local Filesystem / Docker Volume / S3)")]
    end

    Browser <--> UI
    UI <--> ClientAPI
    ClientAPI <--> Router
    Router --> Middleware
    Middleware --> Controller
    Controller --> Service
    Service <--> Redis
    Service --> Repository
    Service <--> FileStorage
    Repository <--> Postgres
```

---

### 2. Design Choices & Rationale

* **Layered Architecture:** Clear division between HTTP routes, controllers, business services, and database repositories prevents coupling and keeps code testable.
* **Immutable Document Versions:** Logical documents and physical file versions are separated (`documents` vs `document_versions`). New revisions increment version numbers without overwriting past files, preserving full audit history.
* **Decoupled File Storage:** Files are stored on a persistent volume mount while PostgreSQL only stores paths, sizes, and MIME types, keeping database backups lean and fast.
* **Fine-Grained Access Control:** Many-to-many department permissions restrict confidential files directly at SQL query time, while allowing public files for all employees.
* **Smart Caching:** Redis caches search queries and hot documents using non-blocking `SCAN` iteration, instantly invalidated upon new uploads or revisions.

---

## Database Design & Entity Relationship

```mermaid
erDiagram
    DEPARTMENTS ||--o{ USERS : "has members"
    USERS ||--o{ DOCUMENTS : "uploads"
    DOCUMENTS ||--|{ DOCUMENT_VERSIONS : "contains history"
    DOCUMENTS ||--o{ DOCUMENT_TAGS : "tagged with"
    TAGS ||--o{ DOCUMENT_TAGS : "categorizes"
    DOCUMENTS ||--o{ DOCUMENT_DEPARTMENT_PERMISSIONS : "restricted to"
    DEPARTMENTS ||--o{ DOCUMENT_DEPARTMENT_PERMISSIONS : "grants access to"

    DEPARTMENTS {
        serial id PK
        varchar name UK
    }

    USERS {
        uuid id PK
        varchar full_name
        varchar email UK
        int department_id FK
        timestamp created_at
    }

    DOCUMENTS {
        uuid id PK
        varchar title
        uuid uploader_id FK
        timestamp created_at
        timestamp updated_at
    }

    DOCUMENT_VERSIONS {
        uuid id PK
        uuid document_id FK
        int version_number
        varchar file_path
        int file_size
        varchar file_type
        timestamp created_at
    }

    TAGS {
        serial id PK
        varchar name UK
    }

    DOCUMENT_TAGS {
        uuid document_id PK,FK
        int tag_id PK,FK
    }

    DOCUMENT_DEPARTMENT_PERMISSIONS {
        uuid document_id PK,FK
        int department_id PK,FK
    }
```

---

## Project Structure

```text
DocDrop/
├── database/
│   └── init.sql                          # Database schema, indexes, and seed data
├── docker-compose.yml                    # Starts PostgreSQL and Redis containers
├── .env.example                          # Root environment template
├── .gitignore                            # Standard git ignore rules
├── README.md                             # Architecture, system design & setup guide
│
├── backend/                              # Node.js + Express REST API (TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── uploads/                          # Local/Volume physical file storage
│   └── src/
│       ├── config/
│       │   ├── db.ts                     # PostgreSQL connection pool & schema migration
│       │   └── redis.ts                  # Redis client with non-blocking SCAN caching
│       ├── controllers/
│       │   └── document.controller.ts    # Request handlers (upload, view, download, search)
│       ├── services/
│       │   └── document.service.ts       # Business rules, versioning, tag management & cache
│       ├── repositories/
│       │   └── document.repository.ts    # SQL queries, transactions & RBAC filters
│       ├── routes/
│       │   ├── index.ts                  # API router aggregation
│       │   └── document.routes.ts        # REST endpoints definition
│       ├── middlewares/
│       │   ├── upload.middleware.ts      # Multer file storage & mime configuration
│       │   └── error.middleware.ts       # Central error handler (Postgres & Multer codes)
│       ├── types/
│       │   └── document.types.ts         # TypeScript interfaces & DTOs
│       ├── utils/
│       │   └── response.util.ts          # Standard JSON API response formatters
│       ├── app.ts                        # Express app setup & middleware pipeline
│       └── server.ts                     # HTTP listener bootstrap
│
└── frontend/                             # Next.js (App Router) + Tailwind CSS UI
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── .env.example
    └── src/
        ├── app/
        │   ├── globals.css               # Global Tailwind CSS directives
        │   ├── layout.tsx                # Root layout & page metadata
        │   └── page.tsx                  # Main DocDrop dashboard (filters, folders, grid/list)
        ├── components/
        │   ├── Navbar.tsx                # Brand, search bar, sort & employee switcher
        │   ├── FolderCard.tsx            # Virtual folder cards for category tags
        │   ├── DocumentCard.tsx          # File card with type badge, quick view & download
        │   ├── DocumentListView.tsx      # Table alternative for file listing
        │   ├── DocumentUploadModal.tsx   # Upload modal with custom tag creation & access control
        │   ├── DocumentDetailModal.tsx   # Metadata inspector, view/download & new revision upload
        │   ├── VersionHistoryTable.tsx   # Detailed revision history table with download links
        │   └── UploadQueue.tsx           # Floating bottom-right upload progress widget
        ├── lib/
        │   └── api.ts                    # REST client & fetcher helpers
        └── types/
            └── index.ts                  # Shared frontend UI types
```

---

## Setup & Running the Infrastructure

### 1. Start Database & Redis
Ensure Docker Desktop is running, then from the project root:
```bash
docker-compose up -d
```
This automatically boots:
- PostgreSQL on port `5433` and applies `database/init.sql`.
- Redis on port `6379`.

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```
API runs on `http://localhost:5000` (Health check: `http://localhost:5000/api/health`).

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

