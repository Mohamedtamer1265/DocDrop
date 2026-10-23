import { query, getClient } from '../config/db';
import {
  Document,
  DocumentVersion,
  Department,
  Tag,
  User,
  SearchDocumentsQuery,
} from '../types/document.types';

export class DocumentRepository {
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

    // Filter by text search (title)
    if (filters.q && filters.q.trim()) {
      sql += ` AND d.title ILIKE $${paramIndex}`;
      params.push(`%${filters.q.trim()}%`);
      paramIndex++;
    }

    // Filter by tag
    if (filters.tag) {
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
    return doc;
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

      await client.query('COMMIT');

      // Return full document
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
}

export default new DocumentRepository();
