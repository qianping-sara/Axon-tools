import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

const EXCLUDED_USER_NAMES = [
  "Rujia Wang",
  "Ge Zeng",
  "DL-fabric",
  "Ken Yu",
  "Mengxi Zhang",
  "Maggie Luo",
];

const smartProposalPool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: "smart_proposal",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

interface ProposalTypeRow extends RowDataPacket {
  proposal_type: string | null;
  cnt: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface UserRow extends RowDataPacket {
  user_id: string;
  user_name: string | null;
  user_mail: string | null;
}

interface SessionNoFilesRow extends RowDataPacket {
  session_id: string;
  created_at: Date;
  user_name: string | null;
  file_urls: string | null; // JSON: array of arrays or strings from JSON_ARRAYAGG
}

export interface DashboardStats {
  totalConversations: number;
  proposalTypeBreakdown: { type: string; count: number; percentage: number }[];
  uniqueUserCount: number;
  uniqueUserList: { user_id: string; user_name: string | null; user_mail: string | null }[];
  sessionsInPeriod: { session_id: string; created_at: string; user_name: string | null; file_urls: string[] }[];
}

const MAX_RANGE_DAYS = 14;

function getDefaultPeriod(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - MAX_RANGE_DAYS);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function parseDate(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const start =
      startParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam)
        ? startParam
        : getDefaultPeriod().start;
    const end =
      endParam && /^\d{4}-\d{2}-\d{2}$/.test(endParam)
        ? endParam
        : getDefaultPeriod().end;

    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) {
      return NextResponse.json(
        { error: "End date must be on or after start date" },
        { status: 400 }
      );
    }
    if (diffDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `Date range cannot exceed ${MAX_RANGE_DAYS} days (prod safety)` },
        { status: 400 }
      );
    }

    const startDateTime = `${start} 00:00:00`;
    const endDateTime = `${end} 23:59:59`;

    const placeholders = EXCLUDED_USER_NAMES.map(() => "?").join(",");

    let conn: Awaited<ReturnType<typeof smartProposalPool.getConnection>> | null = null;
    try {
      conn = await smartProposalPool.getConnection();
      const [totalRows] = await conn.execute<CountRow[]>(
        `SELECT COUNT(DISTINCT m.session_id) AS total
         FROM chat_messages m
         INNER JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.created_at >= ? AND m.created_at <= ?
           AND (s.user_name NOT IN (${placeholders}) OR s.user_name IS NULL)`,
        [startDateTime, endDateTime, ...EXCLUDED_USER_NAMES]
      );

      const totalConversations = totalRows[0]?.total ?? 0;

      const [breakdownRows] = await conn.execute<ProposalTypeRow[]>(
        `SELECT COALESCE(s.proposal_type, '(empty)') AS proposal_type, COUNT(DISTINCT m.session_id) AS cnt
         FROM chat_messages m
         INNER JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.created_at >= ? AND m.created_at <= ?
           AND (s.user_name NOT IN (${placeholders}) OR s.user_name IS NULL)
         GROUP BY s.proposal_type`,
        [startDateTime, endDateTime, ...EXCLUDED_USER_NAMES]
      );

      const proposalTypeBreakdown = (breakdownRows || []).map((row) => ({
        type: row.proposal_type ?? "(empty)",
        count: row.cnt,
        percentage:
          totalConversations > 0
            ? Math.round((row.cnt / totalConversations) * 10000) / 100
            : 0,
      }));

      const [userRows] = await conn.execute<CountRow[]>(
        `SELECT COUNT(DISTINCT s.user_id) AS total
         FROM chat_messages m
         INNER JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.created_at >= ? AND m.created_at <= ?
           AND (s.user_name NOT IN (${placeholders}) OR s.user_name IS NULL)`,
        [startDateTime, endDateTime, ...EXCLUDED_USER_NAMES]
      );

      const uniqueUserCount = userRows[0]?.total ?? 0;

      const [userListRows] = await conn.execute<UserRow[]>(
        `SELECT s.user_id, MAX(s.user_name) AS user_name, MAX(s.user_mail) AS user_mail
         FROM chat_messages m
         INNER JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.created_at >= ? AND m.created_at <= ?
           AND (s.user_name NOT IN (${placeholders}) OR s.user_name IS NULL)
         GROUP BY s.user_id
         ORDER BY MAX(s.user_name) ASC, s.user_id ASC`,
        [startDateTime, endDateTime, ...EXCLUDED_USER_NAMES]
      );

      const uniqueUserList = (userListRows || []).map((row) => ({
        user_id: row.user_id,
        user_name: row.user_name ?? null,
        user_mail: row.user_mail ?? null,
      }));

      const [sessionsNoFilesRows] = await conn.execute<SessionNoFilesRow[]>(
        `SELECT s.id AS session_id, MIN(m.created_at) AS created_at, s.user_name,
         COALESCE(
           (SELECT JSON_ARRAYAGG(m2.file_urls) FROM chat_messages m2
            WHERE m2.session_id = s.id AND m2.created_at >= ? AND m2.created_at <= ?
              AND m2.file_urls IS NOT NULL AND m2.file_urls <> CAST('[]' AS JSON)),
           JSON_ARRAY()
         ) AS file_urls
         FROM chat_sessions s
         INNER JOIN chat_messages m ON m.session_id = s.id
         WHERE m.created_at >= ? AND m.created_at <= ?
           AND (s.user_name NOT IN (${placeholders}) OR s.user_name IS NULL)
         GROUP BY s.id, s.user_name
         ORDER BY created_at`,
        [startDateTime, endDateTime, startDateTime, endDateTime, ...EXCLUDED_USER_NAMES]
      );

      function flattenFileUrls(val: unknown): string[] {
        if (val == null) return [];
        if (typeof val === "string") {
          try {
            const parsed = JSON.parse(val) as unknown;
            return flattenFileUrls(parsed);
          } catch {
            return [];
          }
        }
        if (Array.isArray(val)) {
          const out: string[] = [];
          for (const item of val) {
            if (typeof item === "string") out.push(item);
            else if (Array.isArray(item)) out.push(...item.filter((x): x is string => typeof x === "string"));
            else out.push(...flattenFileUrls(item));
          }
          return out;
        }
        return [];
      }

      const sessionsInPeriod = (sessionsNoFilesRows || []).map((row) => ({
        session_id: row.session_id,
        created_at: (row.created_at as Date).toISOString(),
        user_name: row.user_name ?? null,
        file_urls: flattenFileUrls(row.file_urls),
      }));

      const stats: DashboardStats = {
        totalConversations,
        proposalTypeBreakdown,
        uniqueUserCount,
        uniqueUserList,
        sessionsInPeriod,
      };

      return NextResponse.json({
        start,
        end,
        ...stats,
      });
    } finally {
      if (conn) conn.release();
    }
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
