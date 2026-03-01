"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, BarChart3, Users, MessageSquare, FileText, Copy, Check, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DashboardData {
  start: string;
  end: string;
  totalConversations: number;
  proposalTypeBreakdown: { type: string; count: number; percentage: number }[];
  uniqueUserCount: number;
  uniqueUserList: { user_id: string; user_name: string | null; user_mail: string | null }[];
  sessionsInPeriod: { session_id: string; created_at: string; user_name: string | null; file_urls: string[] }[];
}

function getDefaultPeriod(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 14);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

const MAX_RANGE_DAYS = 14;

function diffDays(start: string, end: string): number {
  const a = new Date(start + "T00:00:00Z").getTime();
  const b = new Date(end + "T00:00:00Z").getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export default function SmartProposalDashboardPage() {
  const [period, setPeriod] = useState(getDefaultPeriod);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/smart-proposal-dashboard?start=${encodeURIComponent(period.start)}&end=${encodeURIComponent(period.end)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period.start, period.end]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleApply = () => {
    const days = diffDays(period.start, period.end);
    if (days < 0) {
      setError("End date must be on or after start date");
      return;
    }
    if (days > MAX_RANGE_DAYS) {
      setError(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
      return;
    }
    setError("");
    fetchStats();
  };

  const rangeDays = diffDays(period.start, period.end);
  const rangeInvalid = rangeDays < 0 || rangeDays > MAX_RANGE_DAYS;

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const copySessionId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="Smart Proposal Dev Dashboard"
            description="Conversation and proposal type statistics for the selected period"
          />
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start" className="text-xs text-muted-foreground">
                Start
              </Label>
              <input
                id="start"
                type="date"
                value={period.start}
                onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end" className="text-xs text-muted-foreground">
                End
              </Label>
              <input
                id="end"
                type="date"
                min={period.start}
                max={
                  period.start
                    ? new Date(new Date(period.start + "T00:00:00Z").getTime() + MAX_RANGE_DAYS * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .slice(0, 10)
                    : undefined
                }
                value={period.end}
                onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <Button
              onClick={handleApply}
              disabled={loading || rangeInvalid}
              size="default"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </div>
      </div>

      <Alert className="mb-6 border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium text-foreground">统计口径：</span>
          本页所有数据（Total conversations、Proposal type breakdown、Unique users、Sessions in period）均按「该时间段内有至少一条消息的会话」统计（以消息时间 created_at 为准），且已排除内部测试账号（Rujia Wang, Ge Zeng, DL-fabric, Ken Yu, Mengxi Zhang, Maggie Luo）。
        </AlertDescription>
      </Alert>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Total conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-semibold tabular-nums">
                  {data.totalConversations.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.start} – {data.end}
                </p>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Proposal type breakdown
                  </p>
                  {data.proposalTypeBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data in this period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 font-medium text-muted-foreground">
                              Type
                            </th>
                            <th className="text-right py-2 font-medium text-muted-foreground">
                              Count
                            </th>
                            <th className="text-right py-2 font-medium text-muted-foreground">
                              %
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.proposalTypeBreakdown.map((row) => (
                            <tr
                              key={row.type}
                              className="border-b border-border/50 last:border-0"
                            >
                              <td className="py-2 font-medium">{row.type}</td>
                              <td className="text-right tabular-nums py-2">
                                {row.count.toLocaleString()}
                              </td>
                              <td className="text-right tabular-nums py-2 text-muted-foreground">
                                {row.percentage}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Unique users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-semibold tabular-nums">
                  {data.uniqueUserCount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Excluding internal test accounts
                </p>
                {data.uniqueUserList.length > 0 && (
                  <div className="border border-border rounded-md overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/50 border-b border-border">
                          <tr>
                            <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                              User
                            </th>
                            <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">
                              ID
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.uniqueUserList.map((u) => (
                            <tr
                              key={u.user_id}
                              className="border-b border-border/50 last:border-0"
                            >
                              <td className="py-1.5 px-2">
                                {u.user_name || u.user_mail || "(no name)"}
                              </td>
                              <td className="py-1.5 px-2 font-mono text-muted-foreground hidden sm:table-cell truncate max-w-[120px]" title={u.user_id}>
                                {u.user_id}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sessions in period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                All sessions with activity in this period. Create time = first message in period. File URLs = generated files (empty = none). Excludes internal test accounts.
              </p>
              {!data.sessionsInPeriod?.length ? (
                <p className="text-sm text-muted-foreground">None.</p>
              ) : (
                <div className="border border-border rounded-md overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/50 border-b border-border">
                        <tr>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                            Create time
                          </th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                            User
                          </th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                            Session ID
                          </th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                            File URLs
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.sessionsInPeriod.map((row) => (
                          <tr
                            key={row.session_id}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                              {formatDateTime(row.created_at)}
                            </td>
                            <td className="py-1.5 px-2">
                              {row.user_name ?? "(no name)"}
                            </td>
                            <td className="py-1.5 px-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono truncate max-w-[180px]" title={row.session_id}>
                                  {row.session_id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copySessionId(row.session_id)}
                                  className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Copy session ID"
                                >
                                  {copiedId === row.session_id ? (
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-1.5 px-2 max-w-[220px]">
                              {row.file_urls.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <ul className="list-disc list-inside space-y-0.5 truncate" title={row.file_urls.join("\n")}>
                                  {row.file_urls.slice(0, 3).map((url, i) => (
                                    <li key={i} className="truncate font-mono text-[11px]">
                                      {url}
                                    </li>
                                  ))}
                                  {row.file_urls.length > 3 && (
                                    <li className="text-muted-foreground">+{row.file_urls.length - 3} more</li>
                                  )}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 px-2">
                    Total: {data.sessionsInPeriod.length} session(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
