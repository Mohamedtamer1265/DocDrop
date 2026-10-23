import { query, getClient } from '../config/db';
import {
  Document,
  DocumentVersion,
  Department,
  Tag,
  User,
  SearchDocumentsQuery,
  ActivityLog,
  StorageAnalytics,
} from '../types/document.types';

export class DocumentRepository {
  private activityTableEnsured = false;

  private async ensureActivityTable(): Promise<void> {
    if (this.activityTableEnsured) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS document_activity_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
          action VARCHAR(100) NOT NULL,
          actor_name VARCHAR(255) NOT NULL DEFAULT 'System',
          details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_activity_logs_doc_id ON document_activity_logs(document_id);
      `);
      this.activityTableEnsured = true;
    } catch {
      // Ignore if unable to run DDL
    }
  }
  /**
   * Search documents with optional filters for title, tag, uploader, and department permission
   */
  async searchDocuments(filters: SearchDocumentsQuery = {}): Promise<Document[]> {
    let sql = `
      SELECT 
        d.id,
        d.title,
        d.uploader_id,
        u.full_name as uploader_name,
        u.email as uploader_email,
        dept.name as uploader_department,
        d.created_at,
        d.updated_at,
        COALESCE(lv.version_number, 1) as current_version,
        COALESCE(lv.file_type, 'unknown') as file_type,
        COALESCE(lv.file_size, 0) as file_size,
        lv.id as latest_version_id,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name)) 
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) as tags,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', perm_dept.id, 'name', perm_dept.name)) 
          FILTER (WHERE perm_dept.id IS NOT NULL), '[]'
        ) as department_permissions
      FROM documents d
      LEFT JOIN users u ON d.uploader_id = u.id
      LEFT JOIN departments dept ON u.department_id = dept.id
      LEFT JOIN LATERAL (
        SELECT id, version_number, file_type, file_size 
        FROM document_versions 
        WHERE document_id = d.id 
        ORDER BY version_number DESC 
        LIMIT 1
      ) lv ON true
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      LEFT JOIN document_department_permissions ddp ON d.id = ddp.document_id
      LEFT JOIN departments perm_dept ON ddp.department_id = perm_dept.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Search across Title, Tags, and Uploader name matching the assessment requirement:
    // "Searching documents by title, tags, and uploader"
    if (filters.q && filters.q.trim()) {
      const term = `%${filters.q.trim()}%`;
      sql += ` AND (
        d.title ILIKE $${paramIndex}
        OR u.full_name ILIKE $${paramIndex}
        OR d.id IN (
          SELECT dt_sub.document_id 
          FROM document_tags dt_sub
          JOIN tags t_sub ON dt_sub.tag_id = t_sub.id
          WHERE t_sub.name ILIKE $${paramIndex}
        )
      )`;
      params.push(term);
      paramIndex++;
    }

    // Filter by multiple tags (Multi-Folder Selection)
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      sql += ` AND d.id IN (
        SELECT dt_sub.document_id FROM document_tags dt_sub
        JOIN tags t_sub ON dt_sub.tag_id = t_sub.id
        WHERE t_sub.name = ANY($${paramIndex}::text[])
      )`;
      params.push(filters.tags);
      paramIndex++;
    } else if (filters.tag) {
      if (isNaN(Number(filters.tag))) {
        sql += ` AND d.id IN (
          SELECT dt_sub.document_id FROM document_tags dt_sub
          JOIN tags t_sub ON dt_sub.tag_id = t_sub.id
          WHERE t_sub.name ILIKE $${paramIndex}
        )`;
        params.push(filters.tag);
      } else {
        sql += ` AND d.id IN (
          SELECT dt_sub.document_id FROM document_tags dt_sub
          WHERE dt_sub.tag_id = $${paramIndex}
        )`;
        params.push(Number(filters.tag));
      }
      paramIndex++;
    }

    // Filter by uploader
    if (filters.uploader) {
      sql += ` AND (d.uploader_id::text = $${paramIndex} OR u.full_name ILIKE $${paramIndex})`;
      params.push(filters.uploader);
      paramIndex++;
    }

    // Filter by department permissions (Access Control)
    // If user's department is provided: document is visible if unrestricted OR explicitly permitted
    if (filters.department_id) {
      sql += ` AND (
        NOT EXISTS (SELECT 1 FROM document_department_permissions WHERE document_id = d.id)
        OR EXISTS (
          SELECT 1 FROM document_department_permissions 
          WHERE document_id = d.id AND department_id = $${paramIndex}
        )
      )`;
      params.push(Number(filters.department_id));
      paramIndex++;
    }

    sql += ` GROUP BY d.id, u.full_name, u.email, dept.name, lv.version_number, lv.file_type, lv.file_size, lv.id
             ORDER BY d.updated_at DESC`;

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Fetch a single document by ID with its tags, department permissions, and version history
   */
  async getDocumentById(id: string): Promise<Document | null> {
    const docSql = `
      SELECT 
        d.id,
        d.title,
        d.uploader_id,
        u.full_name as uploader_name,
        u.email as uploader_email,
        dept.name as uploader_department,
        d.created_at,
        d.updated_at,
        COALESCE(lv.version_number, 1) as current_version,
        COALESCE(lv.file_type, 'unknown') as file_type,
        COALESCE(lv.file_size, 0) as file_size,
        lv.id as latest_version_id,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name)) 
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) as tags,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', perm_dept.id, 'name', perm_dept.name)) 
          FILTER (WHERE perm_dept.id IS NOT NULL), '[]'
        ) as department_permissions
      FROM documents d
      LEFT JOIN users u ON d.uploader_id = u.id
      LEFT JOIN departments dept ON u.department_id = dept.id
      LEFT JOIN LATERAL (
        SELECT id, version_number, file_type, file_size 
        FROM document_versions 
        WHERE document_id = d.id 
        ORDER BY version_number DESC 
        LIMIT 1
      ) lv ON true
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      LEFT JOIN document_department_permissions ddp ON d.id = ddp.document_id
      LEFT JOIN departments perm_dept ON ddp.department_id = perm_dept.id
      WHERE d.id = $1
      GROUP BY d.id, u.full_name, u.email, dept.name, lv.version_number, lv.file_type, lv.file_size, lv.id
    `;

    const docRes = await query(docSql, [id]);
    if (docRes.rows.length === 0) return null;

    const doc = docRes.rows[0];

    // Fetch full version history
    const versionsRes = await query<DocumentVersion>(
      `SELECT id, document_id, version_number, file_path, file_size, file_type, created_at 
       FROM document_versions 
       WHERE document_id = $1 
       ORDER BY version_number DESC`,
      [id]
    );

    doc.versions = versionsRes.rows;

    // Fetch chronological activity & audit logs
    try {
      await this.ensureActivityTable();
      const logsRes = await query<ActivityLog>(
        `SELECT id, document_id, action, actor_name, details, created_at
         FROM document_activity_logs
         WHERE document_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [id]
      );
      doc.activity_logs = logsRes.rows;
    } catch {
      doc.activity_logs = [];
    }

    return doc;
  }

  /**
   * Record an entry in the document activity & audit trail
   */
  async logActivity(
    documentId: string,
    action: string,
    actorName: string = 'Authorized User',
    details: string = ''
  ): Promise<void> {
    try {
      await this.ensureActivityTable();
      await query(
        `INSERT INTO document_activity_logs (document_id, action, actor_name, details)
         VALUES ($1, $2, $3, $4)`,
        [documentId, action, actorName, details]
      );
    } catch {
      // Non-blocking if table is not yet initialized
    }
  }

  /**
   * Create a new document with initial version (v1), tags, and department permissions in a single transaction
   */
  async createDocumentWithInitialVersion(
    title: string,
    uploaderId: string | null,
    filePath: string,
    fileSize: number,
    fileType: string,
    tagIds: number[] = [],
    departmentIds: number[] = []
  ): Promise<Document> {
    await this.ensureActivityTable();
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 1. Insert Document record
      const docInsertSql = `
        INSERT INTO documents (title, uploader_id)
        VALUES ($1, $2)
        RETURNING id, title, uploader_id, created_at, updated_at
      `;
      const docRes = await client.query(docInsertSql, [title, uploaderId]);
      const newDocId = docRes.rows[0].id;

      // 2. Insert Initial Version (v1)
      const versionInsertSql = `
        INSERT INTO document_versions (document_id, version_number, file_path, file_size, file_type)
        VALUES ($1, 1, $2, $3, $4)
        RETURNING id, version_number, file_path, file_size, file_type, created_at
      `;
      await client.query(versionInsertSql, [newDocId, filePath, fileSize, fileType]);

      // 3. Insert Tags
      if (tagIds.length > 0) {
        for (const tagId of tagIds) {
          await client.query(
            `INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newDocId, tagId]
          );
        }
      }

      // 4. Insert Department Permissions
      if (departmentIds.length > 0) {
        for (const deptId of departmentIds) {
          await client.query(
            `INSERT INTO document_department_permissions (document_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newDocId, deptId]
          );
        }
      }

      let actorName = 'Employee';
      if (uploaderId) {
        const uRes = await client.query(`SELECT full_name FROM users WHERE id = $1`, [uploaderId]);
        if (uRes.rows.length > 0) actorName = uRes.rows[0].full_name;
      }

      await client.query('COMMIT');

      // 5. Log initial upload activity & return full document with activity_logs
      await this.logActivity(
        newDocId,
        'UPLOAD_INITIAL',
        actorName,
        `Created document "${title}" with initial version v1`
      );

      const fullDoc = await this.getDocumentById(newDocId);
      return fullDoc!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Add a new version to an existing document
   */
  async addDocumentVersion(
    documentId: string,
    filePath: string,
    fileSize: number,
    fileType: string
  ): Promise<DocumentVersion> {
    await this.ensureActivityTable();
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Calculate next version number
      const maxVerRes = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) as max_v FROM document_versions WHERE document_id = $1`,
        [documentId]
      );
      const nextVersion = maxVerRes.rows[0].max_v + 1;

      // Insert new version
      const insertSql = `
        INSERT INTO document_versions (document_id, version_number, file_path, file_size, file_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, document_id, version_number, file_path, file_size, file_type, created_at
      `;
      const versionRes = await client.query(insertSql, [
        documentId,
        nextVersion,
        filePath,
        fileSize,
        fileType,
      ]);

      // Touch document updated_at
      await client.query(`UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
        documentId,
      ]);

      await client.query('COMMIT');

      // Log version upload activity
      await this.logActivity(
        documentId,
        'UPLOAD_VERSION',
        'Authorized Employee',
        `Uploaded new revision v${nextVersion}`
      );

      return versionRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get specific version by ID
   */
  async getVersionById(versionId: string): Promise<DocumentVersion | null> {
    const res = await query<DocumentVersion>(
      `SELECT id, document_id, version_number, file_path, file_size, file_type, created_at
       FROM document_versions WHERE id = $1`,
      [versionId]
    );
    return res.rows[0] || null;
  }

  /**
   * Delete a specific version of a document
   */
  async deleteDocumentVersion(versionId: string): Promise<{ filePath: string; documentId: string }> {
    await this.ensureActivityTable();
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const verRes = await client.query(
        `SELECT id, document_id, version_number, file_path FROM document_versions WHERE id = $1`,
        [versionId]
      );
      if (verRes.rows.length === 0) {
        throw new Error('Version not found.');
      }
      const { document_id, version_number, file_path } = verRes.rows[0];

      // Check if this is the only version
      const countRes = await client.query(
        `SELECT COUNT(*) FROM document_versions WHERE document_id = $1`,
        [document_id]
      );
      if (parseInt(countRes.rows[0].count, 10) <= 1) {
        throw new Error('Cannot delete the only version of a document. Delete the document instead.');
      }

      await client.query(`DELETE FROM document_versions WHERE id = $1`, [versionId]);
      await client.query(
        `UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [document_id]
      );

      await client.query('COMMIT');

      await this.logActivity(
        document_id,
        'DELETE_VERSION',
        'EEMW Admin',
        `Deleted version v${version_number}`
      );

      return { filePath: file_path, documentId: document_id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a document, its tags, permissions, versions, and return file paths
   */
  async deleteDocument(id: string): Promise<string[]> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const filesRes = await client.query(
        `SELECT file_path FROM document_versions WHERE document_id = $1`,
        [id]
      );
      const filePaths = filesRes.rows.map((r) => r.file_path);

      await client.query(`DELETE FROM documents WHERE id = $1`, [id]);
      await client.query('COMMIT');
      return filePaths;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update document title and its associated tags
   */
  async updateDocument(
    id: string,
    title: string,
    tagIds?: number[]
  ): Promise<Document | null> {
    await this.ensureActivityTable();
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE documents SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [title.trim(), id]
      );

      if (tagIds !== undefined) {
        await client.query(`DELETE FROM document_tags WHERE document_id = $1`, [id]);
        for (const tagId of tagIds) {
          await client.query(
            `INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, tagId]
          );
        }
      }

      await client.query('COMMIT');

      await this.logActivity(
        id,
        'EDIT_METADATA',
        'EEMW Admin',
        `Updated document title to "${title.trim()}"${tagIds !== undefined ? ' and updated tags' : ''}`
      );

      return await this.getDocumentById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch all departments
   */
  async getDepartments(): Promise<Department[]> {
    const res = await query<Department>(`SELECT id, name FROM departments ORDER BY name ASC`);
    return res.rows;
  }

  /**
   * Fetch all tags
   */
  async getTags(): Promise<Tag[]> {
    const res = await query<Tag>(`SELECT id, name FROM tags ORDER BY name ASC`);
    return res.rows;
  }

  /**
   * Find or create a tag by name
   */
  async findOrCreateTag(name: string): Promise<Tag> {
    const trimmed = name.trim();
    const existing = await query<Tag>(`SELECT id, name FROM tags WHERE name ILIKE $1 LIMIT 1`, [trimmed]);
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
    const created = await query<Tag>(
      `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name`,
      [trimmed]
    );
    return created.rows[0];
  }

  /**
   * Fetch all users
   */
  async getUsers(): Promise<User[]> {
    const res = await query<User>(`
      SELECT u.id, u.full_name, u.email, u.department_id, d.name as department_name, u.created_at
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.full_name ASC
    `);
    return res.rows;
  }

  /**
   * Compute repository storage analytics across documents, versions, departments, and MIME types
   */
  async getStorageAnalytics(): Promise<StorageAnalytics> {
    const docCountRes = await query(`SELECT COUNT(*)::int as total_documents FROM documents`);
    const verStatsRes = await query(
      `SELECT COUNT(*)::int as total_versions, COALESCE(SUM(file_size), 0)::bigint as total_bytes FROM document_versions`
    );

    const byDeptRes = await query(`
      SELECT 
        COALESCE(dept.name, 'General') as department,
        COUNT(DISTINCT d.id)::int as count,
        COALESCE(SUM(dv.file_size), 0)::bigint as bytes
      FROM documents d
      LEFT JOIN users u ON d.uploader_id = u.id
      LEFT JOIN departments dept ON u.department_id = dept.id
      LEFT JOIN document_versions dv ON dv.document_id = d.id
      GROUP BY COALESCE(dept.name, 'General')
      ORDER BY bytes DESC
    `);

    const byTypeRes = await query(`
      SELECT 
        CASE
          WHEN file_type ILIKE '%pdf%' THEN 'PDF Documents'
          WHEN file_type ILIKE '%image%' THEN 'Images'
          WHEN file_type ILIKE '%sheet%' OR file_type ILIKE '%excel%' OR file_type ILIKE '%csv%' THEN 'Spreadsheets'
          WHEN file_type ILIKE '%word%' OR file_type ILIKE '%document%' THEN 'Word Docs'
          WHEN file_type ILIKE '%text%' OR file_type ILIKE '%markdown%' OR file_type ILIKE '%json%' THEN 'Text & Code'
          ELSE 'Other Files'
        END as category,
        COUNT(*)::int as count,
        COALESCE(SUM(file_size), 0)::bigint as bytes
      FROM document_versions
      GROUP BY category
      ORDER BY bytes DESC
    `);

    return {
      total_documents: Number(docCountRes.rows[0]?.total_documents || 0),
      total_versions: Number(verStatsRes.rows[0]?.total_versions || 0),
      total_bytes: Number(verStatsRes.rows[0]?.total_bytes || 0),
      quota_bytes: 100 * 1024 * 1024, // 100 MB workspace storage tier
      by_department: byDeptRes.rows.map((r) => ({
        department: r.department,
        count: Number(r.count),
        bytes: Number(r.bytes),
      })),
      by_type: byTypeRes.rows.map((r) => ({
        category: r.category,
        count: Number(r.count),
        bytes: Number(r.bytes),
      })),
    };
  }
}

export default new DocumentRepository();
