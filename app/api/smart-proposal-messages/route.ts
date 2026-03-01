import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

// Create a separate pool for smart_proposal database
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

interface SmartProposalResult extends RowDataPacket {
  session_id: string;
  session_name: string;
  proposal_type: string;
  user_id: string;
  user_name: string;
  session_status: string;
  session_created_at: Date;
  message_id: string | null;
  role: string | null;
  content: string | null;
  file_urls: string | null;
  message_created_at: Date | null;
}

export interface SessionInfo {
  session_id: string;
  session_name: string;
  proposal_type: string;
  user_id: string;
  user_name: string;
  session_status: string;
  session_created_at: string;
}

export interface ChatMessage {
  message_id: string;
  role: string;
  content: string;
  file_urls: string | null;
  message_created_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Validate UUID format to prevent SQL injection
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: "Invalid Session ID format" },
        { status: 400 }
      );
    }

    // First check if proposal_type column exists
    const [columns] = await smartProposalPool.execute(
      `SHOW COLUMNS FROM chat_sessions LIKE 'proposal_type'`
    );
    
    const hasProposalType = Array.isArray(columns) && columns.length > 0;
    
    const proposalTypeField = hasProposalType ? 's.proposal_type,' : `'' AS proposal_type,`;
    
    const [rows] = await smartProposalPool.execute<SmartProposalResult[]>(
      `SELECT 
        s.id AS session_id,
        s.name AS session_name,
        ${proposalTypeField}
        s.user_id,
        s.user_name,
        s.status AS session_status,
        s.created_at AS session_created_at,
        m.id AS message_id,
        m.role,
        m.content,
        m.file_urls,
        m.created_at AS message_created_at
      FROM 
        chat_sessions s
      LEFT JOIN 
        chat_messages m ON s.id = m.session_id
      WHERE 
        s.id = ?
      ORDER BY 
        m.created_at ASC`,
      [sessionId]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        sessionInfo: null,
        messages: [],
      });
    }

    // Extract session info from first row
    const sessionInfo: SessionInfo = {
      session_id: rows[0].session_id,
      session_name: rows[0].session_name,
      proposal_type: rows[0].proposal_type,
      user_id: rows[0].user_id,
      user_name: rows[0].user_name,
      session_status: rows[0].session_status,
      session_created_at: rows[0].session_created_at.toISOString(),
    };

    // Extract messages (filter out rows with null message_id)
    const messages: ChatMessage[] = rows
      .filter((row) => row.message_id !== null)
      .map((row) => ({
        message_id: row.message_id as string,
        role: row.role as string,
        content: row.content as string,
        file_urls: row.file_urls,
        message_created_at: (row.message_created_at as Date).toISOString(),
      }));

    return NextResponse.json({
      sessionInfo,
      messages,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch smart proposal data" },
      { status: 500 }
    );
  }
}
