import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { getRedis, DASHBOARD_CACHE_KEY } from "@/lib/redis";

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

interface SessionNoFilesRow extends RowDataPacket {
  session_id: string;
  created_at: Date;
  user_name: string | null;
  proposal_type: string | null;
  file_urls: string | null;
}

export interface DashboardStats {
  sessionsInPeriod: {
    session_id: string;
    created_at: string;
    user_name: string | null;
    proposal_type: string | null;
    file_urls: string[];
  }[];
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

export { getDefaultPeriod };

function parseDate(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function flattenFileUrls(val: unknown): string[] {
  if (val == null) return [];
  if (typeof val === "string") {
    try {
      return flattenFileUrls(JSON.parse(val) as unknown);
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

export async function fetchSessionsFromDb(
  start: string,
  end: string
): Promise<DashboardStats["sessionsInPeriod"]> {
  const startDateTime = `${start} 00:00:00`;
  const endDateTime = `${end} 23:59:59`;
  const placeholders = EXCLUDED_USER_NAMES.map(() => "?").join(",");

  let conn: Awaited<ReturnType<typeof smartProposalPool.getConnection>> | null = null;
  try {
    conn = await smartProposalPool.getConnection();
    const [rows] = await conn.execute<SessionNoFilesRow[]>(
      `SELECT s.id AS session_id, MIN(m.created_at) AS created_at, s.user_name, s.proposal_type,
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
       GROUP BY s.id, s.user_name, s.proposal_type
       ORDER BY created_at`,
      [startDateTime, endDateTime, startDateTime, endDateTime, ...EXCLUDED_USER_NAMES]
    );

    return (rows || []).map((row) => ({
      session_id: row.session_id,
      created_at: (row.created_at as Date).toISOString(),
      user_name: row.user_name ?? null,
      proposal_type: row.proposal_type ?? null,
      file_urls: flattenFileUrls(row.file_urls),
    }));
  } finally {
    if (conn) conn.release();
  }
}

export async function GET() {
  try {
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({
        start: null,
        end: null,
        generatedAt: null,
        sessionsInPeriod: [],
        fromCache: false,
        error: "Redis not configured",
      });
    }

    const raw = await redis.get(DASHBOARD_CACHE_KEY);
    if (!raw) {
      return NextResponse.json({
        start: null,
        end: null,
        generatedAt: null,
        sessionsInPeriod: [],
        fromCache: false,
      });
    }

    const cached = JSON.parse(raw) as {
      start: string;
      end: string;
      generatedAt: string;
      sessionsInPeriod: DashboardStats["sessionsInPeriod"];
    };

    return NextResponse.json({
      ...cached,
      fromCache: true,
    });
  } catch (error) {
    console.error("Dashboard GET (Redis) error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard cache" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const startParam = body.start ?? request.nextUrl.searchParams.get("start");
    const endParam = body.end ?? request.nextUrl.searchParams.get("end");

    const start =
      typeof startParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startParam)
        ? startParam
        : getDefaultPeriod().start;
    const end =
      typeof endParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endParam)
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

    const sessionsInPeriod = await fetchSessionsFromDb(start, end);
    const generatedAt = new Date().toISOString();

    const redis = getRedis();
    if (redis) {
      await redis.set(
        DASHBOARD_CACHE_KEY,
        JSON.stringify({ start, end, generatedAt, sessionsInPeriod })
      );
    }

    return NextResponse.json({
      start,
      end,
      generatedAt,
      sessionsInPeriod,
      fromCache: false,
    });
  } catch (error) {
    console.error("Dashboard POST (reload) error:", error);
    return NextResponse.json(
      { error: "Failed to reload dashboard" },
      { status: 500 }
    );
  }
}
