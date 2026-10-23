-- Database Initialization Script for Document Repository

-- 1. Organization & Identity
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Core Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Version History & File Pointers
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(512) NOT NULL, -- Stores Docker volume / storage path (e.g., 'uploads/1700-file.pdf')
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, version_number)
);

-- 4. Virtual Folders (Tags)
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS document_tags (
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);

-- 5. Access Control
CREATE TABLE IF NOT EXISTS document_department_permissions (
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, department_id)
);

-- 6. Search Optimization & Indexes
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag_id);

-- 7. Initial Seed Data (Departments & Sample Users for Testing)
INSERT INTO departments (name) VALUES 
    ('Engineering'),
    ('Legal'),
    ('Finance'),
    ('Human Resources')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tags (name) VALUES 
    ('Policy'),
    ('Technical Spec'),
    ('Financial Report'),
    ('Contract'),
    ('Confidential'),
    ('Design Proposal')
ON CONFLICT (name) DO NOTHING;

-- Seed Sample Employees
INSERT INTO users (full_name, email, department_id)
SELECT 'Diana Prince', 'diana@docdrop.internal', d.id
FROM departments d WHERE d.name = 'Legal'
AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'diana@docdrop.internal');

INSERT INTO users (full_name, email, department_id)
SELECT 'Alex Chen', 'alex@docdrop.internal', d.id
FROM departments d WHERE d.name = 'Engineering'
AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'alex@docdrop.internal');

INSERT INTO users (full_name, email, department_id)
SELECT 'Sarah Connor', 'sarah@docdrop.internal', d.id
FROM departments d WHERE d.name = 'Finance'
AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'sarah@docdrop.internal');

-- 8. Seed Initial Documents & Versions
DO $$
DECLARE
    u_diana UUID;
    u_alex UUID;
    d_doc1 UUID;
    d_doc2 UUID;
    t_policy INT;
    t_proposal INT;
    dept_legal INT;
    dept_eng INT;
BEGIN
    SELECT id INTO u_diana FROM users WHERE email = 'diana@docdrop.internal' LIMIT 1;
    SELECT id INTO u_alex FROM users WHERE email = 'alex@docdrop.internal' LIMIT 1;
    SELECT id INTO t_policy FROM tags WHERE name = 'Policy' LIMIT 1;
    SELECT id INTO t_proposal FROM tags WHERE name = 'Design Proposal' LIMIT 1;
    SELECT id INTO dept_legal FROM departments WHERE name = 'Legal' LIMIT 1;
    SELECT id INTO dept_eng FROM departments WHERE name = 'Engineering' LIMIT 1;

    -- Document 1: Design Research
    IF NOT EXISTS (SELECT 1 FROM documents WHERE title = 'Design Research') THEN
        INSERT INTO documents (title, uploader_id) VALUES ('Design Research', u_diana) RETURNING id INTO d_doc1;
        -- Version 1 & Version 2
        INSERT INTO document_versions (document_id, version_number, file_path, file_size, file_type)
        VALUES (d_doc1, 1, 'uploads/sample-research.pdf', 1420500, 'application/pdf');
        INSERT INTO document_versions (document_id, version_number, file_path, file_size, file_type)
        VALUES (d_doc1, 2, 'uploads/sample-research.pdf', 1580200, 'application/pdf');
        -- Tag
        IF t_policy IS NOT NULL THEN
            INSERT INTO document_tags (document_id, tag_id) VALUES (d_doc1, t_policy) ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Document 2: design proposals
    IF NOT EXISTS (SELECT 1 FROM documents WHERE title = 'design proposals') THEN
        INSERT INTO documents (title, uploader_id) VALUES ('design proposals', u_alex) RETURNING id INTO d_doc2;
        INSERT INTO document_versions (document_id, version_number, file_path, file_size, file_type)
        VALUES (d_doc2, 1, 'uploads/sample-proposal.pdf', 840300, 'application/pdf');
        IF t_proposal IS NOT NULL THEN
            INSERT INTO document_tags (document_id, tag_id) VALUES (d_doc2, t_proposal) ON CONFLICT DO NOTHING;
        END IF;
        -- Restrict to Engineering
        IF dept_eng IS NOT NULL THEN
            INSERT INTO document_department_permissions (document_id, department_id) VALUES (d_doc2, dept_eng) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;
