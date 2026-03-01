import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2";

interface ChatMessage extends RowDataPacket {
  role: string;
  content: string;
  created_at: Date;
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

    const [rows] = await pool.execute<ChatMessage[]>(
      `SELECT role, content, created_at 
       FROM chat_messages 
       WHERE session_id = ? 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}
