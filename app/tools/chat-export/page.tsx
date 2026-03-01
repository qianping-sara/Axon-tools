"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Search, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { MarkdownContent } from "@/components/markdown-content";

// Chat message type
interface ChatMessage {
  role: string;
  content: string;
  created_at: string;
}

export default function ChatExportPage() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleSearch = async () => {
    if (!sessionId.trim()) {
      setError("Please enter a Session ID");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const response = await fetch("/api/chat-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch messages");
      }

      setMessages(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (messages.length === 0) return;

    const headers = ["Role", "Content", "Created At"];
    const csvContent = [
      headers.join(","),
      ...messages.map((msg) => {
        const escapedContent = `"${msg.content.replace(/"/g, '""')}"`;
        const formattedDate = new Date(msg.created_at).toISOString();
        return [msg.role, escapedContent, formattedDate].join(",");
      }),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-export-${sessionId.slice(0, 8)}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const simpleMarkdownToHtml = (text: string): string => {
    return text
      .replace(/^### (.*$)/gm, '<h3 style="font-size: 16px; margin: 12px 0 4px; font-weight: 600;">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 style="font-size: 18px; margin: 14px 0 6px; font-weight: 600;">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 style="font-size: 20px; margin: 16px 0 8px; font-weight: 600;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 13px;">$1</code>')
      .replace(/^\s*[-*]\s+(.*)$/gm, '<li style="margin: 4px 0;">$1</li>')
      .replace(/(<li.*<\/li>\n?)+/g, '<ul style="margin: 8px 0; padding-left: 24px;">$&</ul>')
      .replace(/^\d+\.\s+(.*)$/gm, '<li style="margin: 4px 0;">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin: 8px 0;">')
      .replace(/\n/g, '<br>');
  };

  const handleExportPDF = () => {
    if (messages.length === 0) return;

    setExportingPdf(true);
    try {
      const messagesHtml = messages.map((msg) => {
        const htmlContent = simpleMarkdownToHtml(msg.content);
        const roleColor = msg.role === "user" ? "#22c55e" : "#f97316";
        const roleBg = msg.role === "user" ? "#dcfce7" : "#ffedd5";
        return `
          <div style="border: 1px solid #e5e5e5; border-radius: 8px; margin-bottom: 12px; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #f5f5f5; border-bottom: 1px solid #e5e5e5;">
              <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${roleBg}; color: ${roleColor};">${msg.role}</span>
              <span style="font-size: 12px; color: #737373; font-family: monospace;">${formatDate(msg.created_at)}</span>
            </div>
            <div style="padding: 16px; font-size: 14px; line-height: 1.6;">${htmlContent}</div>
          </div>
        `;
      });

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Chat Export - ${sessionId.slice(0, 8)}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #171717; line-height: 1.6; }
              h1 { font-size: 24px; margin-bottom: 8px; }
              .meta { color: #737373; font-size: 14px; margin-bottom: 24px; }
              .markdown-content { font-size: 14px; }
              .markdown-content h1 { font-size: 20px; margin: 16px 0 8px; }
              .markdown-content h2 { font-size: 18px; margin: 14px 0 6px; }
              .markdown-content h3 { font-size: 16px; margin: 12px 0 4px; }
              .markdown-content p { margin: 8px 0; }
              .markdown-content ul, .markdown-content ol { margin: 8px 0; padding-left: 24px; }
              .markdown-content li { margin: 4px 0; }
              .markdown-content code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: 'SF Mono', Monaco, monospace; }
              .markdown-content pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
              .markdown-content pre code { background: none; padding: 0; }
              .markdown-content blockquote { border-left: 3px solid #22c55e; padding-left: 12px; margin: 12px 0; color: #525252; }
              .markdown-content table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
              .markdown-content th, .markdown-content td { border: 1px solid #e5e5e5; padding: 8px 12px; text-align: left; }
              .markdown-content th { background: #f5f5f5; font-weight: 600; }
              .markdown-content a { color: #22c55e; }
              .markdown-content hr { border: none; border-top: 1px solid #e5e5e5; margin: 16px 0; }
              @media print {
                body { padding: 20px; }
                div[style*="border-radius: 8px"] { break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <h1>Chat Export</h1>
            <p class="meta">Session: ${sessionId} | Messages: ${messages.length} | Exported: ${new Date().toLocaleString("zh-CN")}</p>
            ${messagesHtml.join("")}
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (err) {
      console.error("PDF export failed:", err);
      setError("Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="w-[80%] max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>
        <PageHeader
          title="CompanyResearch Chat Export"
          description="Export CompanyResearch chat messages by session ID to CSV or PDF format"
        />
      </div>

      <div className="space-y-6">
        <div className="p-6 border border-border rounded-lg bg-card">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId" className="text-sm font-medium">
                Session ID
              </Label>
              <div className="flex gap-3">
                <Input
                  id="sessionId"
                  placeholder="e.g. 974e2e1e-f0a5-477f-ba7f-23dd1b30fb90"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="shrink-0"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">Query</span>
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        {searched && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {messages.length > 0
                  ? `Found ${messages.length} message${messages.length > 1 ? "s" : ""}`
                  : "No messages found"}
              </p>
              {messages.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="gap-2 bg-transparent"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={exportingPdf}
                    className="gap-2 bg-transparent"
                  >
                    {exportingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Export PDF
                  </Button>
                </div>
              )}
            </div>

            {messages.length > 0 && (
              <div className="space-y-3">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`border border-border rounded-lg overflow-hidden ${
                      msg.role === "user" ? "bg-card" : "bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                          msg.role === "user"
                            ? "bg-primary/15 text-primary"
                            : msg.role === "assistant"
                              ? "bg-accent/25 text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {msg.role}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <div className="p-4">
                      <MarkdownContent content={msg.content} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
