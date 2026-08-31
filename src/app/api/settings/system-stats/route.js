import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    })
  : null;

export async function GET(request) {
  if (!pool) {
    return NextResponse.json({ success: false, error: 'Chưa cấu hình DATABASE_URL' }, { status: 500 });
  }

  let client = null;
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'all';
    const filter = searchParams.get('filter') || 'all'; // all, missing_meta, has_meta, missing_md, has_md, completed
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(10, Math.min(200, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    client = await pool.connect();

    // 1. Thống kê tổng quan (Overall Stats)
    const overallRes = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN so_vb IS NOT NULL AND TRIM(so_vb) != '' AND TRIM(so_vb) != 'Đang cập nhật' AND TRIM(so_vb) != '—' AND ngay_phat_hanh IS NOT NULL AND TRIM(ngay_phat_hanh) != '' THEN 1 END) as has_meta,
        COUNT(CASE WHEN so_vb IS NULL OR TRIM(so_vb) = '' OR TRIM(so_vb) = 'Đang cập nhật' OR TRIM(so_vb) = '—' OR ngay_phat_hanh IS NULL OR TRIM(ngay_phat_hanh) = '' THEN 1 END) as missing_meta,
        COUNT(CASE WHEN is_md_generated = true OR (content_md IS NOT NULL AND TRIM(content_md) != '') THEN 1 END) as has_md,
        COUNT(CASE WHEN (is_md_generated IS NULL OR is_md_generated = false) AND (content_md IS NULL OR TRIM(content_md) = '') THEN 1 END) as missing_md
      FROM drive_file_metadata
    `);
    const o = overallRes.rows[0] || {};
    const totalAll = parseInt(o.total || '0', 10);
    const hasMetaAll = parseInt(o.has_meta || '0', 10);
    const missingMetaAll = parseInt(o.missing_meta || '0', 10);
    const hasMdAll = parseInt(o.has_md || '0', 10);
    const missingMdAll = parseInt(o.missing_md || '0', 10);

    const overall = {
      total: totalAll,
      hasMeta: hasMetaAll,
      missingMeta: missingMetaAll,
      hasMd: hasMdAll,
      missingMd: missingMdAll,
      metaPercent: totalAll > 0 ? (hasMetaAll / totalAll) * 100 : 0,
      mdPercent: totalAll > 0 ? (hasMdAll / totalAll) * 100 : 0
    };

    // 2. Thống kê theo từng Dự án (Project Breakdown)
    const byProjectRes = await client.query(`
      SELECT 
        p.id as project_id,
        COALESCE(p.basic_info->>'shortName', p.name, 'Chưa phân loại dự án') as project_name,
        COUNT(m.file_id) as total,
        COUNT(CASE WHEN m.so_vb IS NOT NULL AND TRIM(m.so_vb) != '' AND TRIM(m.so_vb) != 'Đang cập nhật' AND TRIM(m.so_vb) != '—' AND m.ngay_phat_hanh IS NOT NULL AND TRIM(m.ngay_phat_hanh) != '' THEN 1 END) as has_meta,
        COUNT(CASE WHEN m.so_vb IS NULL OR TRIM(m.so_vb) = '' OR TRIM(m.so_vb) = 'Đang cập nhật' OR TRIM(m.so_vb) = '—' OR m.ngay_phat_hanh IS NULL OR TRIM(m.ngay_phat_hanh) = '' THEN 1 END) as missing_meta,
        COUNT(CASE WHEN m.is_md_generated = true OR (m.content_md IS NOT NULL AND TRIM(m.content_md) != '') THEN 1 END) as has_md,
        COUNT(CASE WHEN (m.is_md_generated IS NULL OR m.is_md_generated = false) AND (m.content_md IS NULL OR TRIM(m.content_md) = '') THEN 1 END) as missing_md
      FROM drive_file_metadata m
      LEFT JOIN drive_folders_flat f ON m.folder_id = f.folder_id
      LEFT JOIN projects p ON f.project_id = p.id
      GROUP BY p.id, p.basic_info, p.name
      ORDER BY total DESC
    `);

    const byProject = byProjectRes.rows.map(row => {
      const tot = parseInt(row.total || '0', 10);
      const hm = parseInt(row.has_meta || '0', 10);
      const mm = parseInt(row.missing_meta || '0', 10);
      const hmd = parseInt(row.has_md || '0', 10);
      const mmd = parseInt(row.missing_md || '0', 10);
      return {
        projectId: row.project_id,
        projectName: row.project_name,
        total: tot,
        hasMeta: hm,
        missingMeta: mm,
        hasMd: hmd,
        missingMd: mmd,
        metaPercent: tot > 0 ? (hm / tot) * 100 : 0,
        mdPercent: tot > 0 ? (hmd / tot) * 100 : 0
      };
    });

    // 3. Xây dựng điều kiện lọc danh sách file
    const whereConditions = [];
    const queryParams = [];

    // Lọc theo dự án
    if (projectId && projectId !== 'all') {
      queryParams.push(projectId);
      whereConditions.push(`f.project_id = $${queryParams.length}`);
    }

    // Lọc theo trạng thái
    if (filter === 'missing_meta') {
      whereConditions.push(`(m.so_vb IS NULL OR TRIM(m.so_vb) = '' OR TRIM(m.so_vb) = 'Đang cập nhật' OR TRIM(m.so_vb) = '—' OR m.ngay_phat_hanh IS NULL OR TRIM(m.ngay_phat_hanh) = '')`);
    } else if (filter === 'has_meta') {
      whereConditions.push(`(m.so_vb IS NOT NULL AND TRIM(m.so_vb) != '' AND TRIM(m.so_vb) != 'Đang cập nhật' AND TRIM(m.so_vb) != '—' AND m.ngay_phat_hanh IS NOT NULL AND TRIM(m.ngay_phat_hanh) != '')`);
    } else if (filter === 'missing_md') {
      whereConditions.push(`((m.is_md_generated IS NULL OR m.is_md_generated = false) AND (m.content_md IS NULL OR TRIM(m.content_md) = ''))`);
    } else if (filter === 'has_md') {
      whereConditions.push(`(m.is_md_generated = true OR (m.content_md IS NOT NULL AND TRIM(m.content_md) != ''))`);
    } else if (filter === 'completed') {
      whereConditions.push(`(m.so_vb IS NOT NULL AND TRIM(m.so_vb) != '' AND TRIM(m.so_vb) != 'Đang cập nhật' AND TRIM(m.so_vb) != '—' AND m.ngay_phat_hanh IS NOT NULL AND TRIM(m.ngay_phat_hanh) != '' AND (m.is_md_generated = true OR (m.content_md IS NOT NULL AND TRIM(m.content_md) != '')))`);
    }

    // Lọc theo từ khóa tìm kiếm
    if (search) {
      queryParams.push(`%${search}%`);
      const pIdx = queryParams.length;
      whereConditions.push(`(
        LOWER(m.file_name) LIKE $${pIdx} OR 
        LOWER(COALESCE(m.so_vb, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(m.trich_yeu, '')) LIKE $${pIdx} OR 
        LOWER(COALESCE(m.noi_phat_hanh, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(m.folder_name, '')) LIKE $${pIdx}
      )`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Đếm tổng số dòng khớp bộ lọc
    const countFilteredRes = await client.query(`
      SELECT COUNT(*) as filtered_total
      FROM drive_file_metadata m
      LEFT JOIN drive_folders_flat f ON m.folder_id = f.folder_id
      LEFT JOIN projects p ON f.project_id = p.id
      ${whereClause}
    `, queryParams);
    const totalFiltered = parseInt(countFilteredRes.rows[0]?.filtered_total || '0', 10);
    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    // Lấy dữ liệu trang hiện tại
    const listParams = [...queryParams, limit, offset];
    const filesRes = await client.query(`
      SELECT 
        m.file_id AS id,
        m.file_id AS "fileId",
        m.file_name AS "fileName",
        m.file_name AS name,
        m.so_vb AS "soVb",
        m.so_vb AS "documentNumber",
        m.loai_vb AS "loaiVb",
        m.loai_vb AS "documentType",
        m.ngay_phat_hanh AS "ngayPhatHanh",
        m.ngay_phat_hanh AS "documentDate",
        m.noi_phat_hanh AS "noiPhatHanh",
        m.noi_phat_hanh AS "issuingAgency",
        m.noi_gui AS "noiGui",
        m.noi_gui AS "receivingAgency",
        m.trich_yeu AS "trichYeu",
        m.trich_yeu AS summary,
        m.web_view_link AS "webViewLink",
        m.web_view_link AS "driveWebLink",
        m.folder_id AS "folderId",
        m.folder_name AS "folderName",
        m.folder_name AS folder,
        m.is_outgoing AS "isOutgoing",
        m.content_md AS "contentMd",
        m.is_md_generated AS "isMdGenerated",
        m.md_char_count AS "mdCharCount",
        m.md_generated_at AS "mdGeneratedAt",
        m.modified_time AS "modifiedTime",
        f.project_id AS "projectId",
        COALESCE(p.basic_info->>'shortName', p.name, 'Chưa phân loại dự án') AS "projectName"
      FROM drive_file_metadata m
      LEFT JOIN drive_folders_flat f ON m.folder_id = f.folder_id
      LEFT JOIN projects p ON f.project_id = p.id
      ${whereClause}
      ORDER BY 
        CASE WHEN m.so_vb IS NULL OR TRIM(m.so_vb) = '' OR TRIM(m.so_vb) = 'Đang cập nhật' THEN 0 ELSE 1 END ASC,
        m.modified_time DESC,
        m.file_name ASC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
    `, listParams);

    const files = filesRes.rows.map(f => {
      const hasMeta = !!(f.soVb && f.soVb.trim() !== '' && f.soVb.trim() !== 'Đang cập nhật' && f.soVb.trim() !== '—' && f.ngayPhatHanh && f.ngayPhatHanh.trim() !== '');
      const hasMd = !!(f.isMdGenerated || (f.contentMd && f.contentMd.trim() !== ''));

      return {
        ...f,
        hasMeta,
        hasMd
      };
    });

    return NextResponse.json({
      success: true,
      overall,
      byProject,
      pagination: {
        page,
        limit,
        totalFiltered,
        totalPages
      },
      files
    });

  } catch (error) {
    console.error('Lỗi khi lấy thống kê hệ thống:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
