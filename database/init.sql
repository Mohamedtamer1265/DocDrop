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
    role VARCHAR(100) DEFAULT 'Editor (Upload & View)',
    can_upload BOOLEAN DEFAULT TRUE,
    can_view BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
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
    file_size BIGINT NOT NULL,
    file_type VARCHAR(255) NOT NULL,
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

-- 6. Activity & Audit Logs
CREATE TABLE IF NOT EXISTS document_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    actor_name VARCHAR(255) NOT NULL DEFAULT 'System',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Search Optimization & Indexes
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_doc_id ON document_activity_logs(document_id);

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

-- Seed System Admin & Sample Employees with Role Permissions
INSERT INTO users (full_name, email, department_id, role, can_upload, can_view, is_admin)
SELECT 'EEMW Admin', 'admin@docdrop.internal', NULL, 'System Admin', TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@docdrop.internal');

INSERT INTO users (full_name, email, department_id, role, can_upload, can_view, is_admin)
SELECT 'Diana Prince', 'diana@docdrop.internal', d.id, 'Editor (Upload & View)', TRUE, TRUE, FALSE
FROM departments d WHERE d.name = 'Legal'
AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'diana@docdrop.internal');

INSERT INTO users (full_name, email, department_id, role, can_upload, can_view, is_admin)
SELECT 'Alex Chen', 'alex@docdrop.internal', d.id, 'Viewer (View Only)', FALSE, TRUE, FALSE
FROM departments d WHERE d.name = 'Engineering'
AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'alex@docdrop.internal');

INSERT INTO users (full_name, email, department_id, role, can_upload, can_view, is_admin)
SELECT 'Sarah Connor', 'sarah@docdrop.internal', d.id, 'Restricted (No Access)', FALSE, FALSE, FALSE
FROM departments d WHERE d.name = 'Finance'
AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'sarah@docdrop.internal');
