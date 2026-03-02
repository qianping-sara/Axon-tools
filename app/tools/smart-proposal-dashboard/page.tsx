"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, FileText, Copy, Check, Info, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DashboardData {
  start: string | null;
  end: string | null;
  generatedAt: string | null;
  sessionsInPeriod: { session_id: string; created_at: string; user_name: string | null; proposal_type: string | null; file_urls: string[] }[];
  fromCache?: boolean;
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
      const res = await fetch("/api/smart-proposal-dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleForceReload = async () => {
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
    setLoading(true);
    try {
      const res = await fetch("/api/smart-proposal-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: period.start, end: period.end }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reload failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reload failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  const handleDownloadCsv = () => {
    if (!data?.sessionsInPeriod?.length) return;

    const rows = data.sessionsInPeriod;
    const header = [
      "Create time",
      "User",
      "Proposal type",
      "Session ID",
      "File URLs",
    ];

    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

    const csv = [
      header.join(","),
      ...rows.map((row) => {
        const fileUrlsJoined = row.file_urls.join(" | ");
        return [
          escape(formatDateTime(row.created_at)),
          escape(row.user_name ?? ""),
          escape(row.proposal_type ?? ""),
          escape(row.session_id),
          escape(fileUrlsJoined),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smart-proposal-dev-dashboard-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                Start（强制刷新时使用）
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
                End（强制刷新时使用）
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
              onClick={handleForceReload}
              disabled={loading || rangeInvalid}
              size="default"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "强制刷新"
              )}
            </Button>
          </div>
        </div>
      </div>

      <Alert className="mb-6 border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium text-foreground">统计口径：</span>
          下表为「该时间段内有至少一条消息的会话」（以消息时间 created_at 为准），已排除内部测试账号（Rujia Wang, Ge Zeng, DL-fabric, Ken Yu, Mengxi Zhang, Maggie Luo）。系统每天新加坡时间 12:00 会按默认时间区间自动刷新并写入 Redis，页面默认读取最近一次缓存结果，仅在需要查看自定义时间范围时使用上方日期 +「强制刷新」访问数据库。
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
          <Card>
            <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sessions in period
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCsv}
                disabled={!data.sessionsInPeriod?.length}
                className="gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download CSV</span>
              </Button>
            </CardHeader>
            <CardContent>
              {data.start != null && data.end != null && (
                <p className="text-xs text-muted-foreground mb-2">
                  结果对应时间：{data.start} – {data.end}
                  {data.generatedAt && (
                    <> · 生成于 {formatDateTime(data.generatedAt)}</>
                  )}
                </p>
              )}
              {data.fromCache === false && data.sessionsInPeriod?.length === 0 && data.start == null && (
                <p className="text-sm text-muted-foreground mb-3">
                  暂无缓存数据，请选择时间范围后点击「强制刷新」从数据库加载。
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-3">
                Create time = first message in period. File URLs = generated files (empty = none). Excludes internal test accounts.
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
                            Proposal type
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
                        {(data.sessionsInPeriod ?? []).slice(0, 30).map((row) => (
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
                              {row.proposal_type ?? "—"}
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
                            <td className="py-1.5 px-2">
                              {row.file_urls.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {row.file_urls.map((url, i) => (
                                    <li key={i} className="break-all font-mono text-[11px]">
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline underline-offset-2"
                                      >
                                        {url}
                                      </a>
                                    </li>
                                  ))}
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
                    {data.sessionsInPeriod.length > 30 && " · Showing first 30 in table"}
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
