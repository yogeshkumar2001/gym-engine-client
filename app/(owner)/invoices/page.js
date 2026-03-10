'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi } from '@/lib/api';
import StatCard from '@/components/shared/StatCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  FileText, Calendar, IndianRupee, TrendingUp, Download,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmount(v) {
  return v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const PAGE_SIZE = 50;

// ─── Invoices Page ────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [offset, setOffset]           = useState(0);
  const [downloading, setDownloading] = useState(null); // renewalId being downloaded

  // Summary cards
  const { data: summary } = useQuery({
    queryKey: ['invoices-summary'],
    queryFn:  () => invoiceApi.summary().then((r) => r.data.data),
  });

  // Invoice list
  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoices', offset],
    queryFn:  () =>
      invoiceApi.list({ limit: PAGE_SIZE, offset }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  async function handleDownload(renewalId, memberName) {
    setDownloading(renewalId);
    try {
      const res = await invoiceApi.download(renewalId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      downloadBlob(blob, `invoice-${renewalId}-${memberName.replace(/\s+/g, '_')}.pdf`);
      toast.success('Invoice downloaded.');
    } catch {
      toast.error('Failed to download invoice.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-5">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          title="Total Invoices"
          value={summary?.total_invoices ?? '—'}
          icon={FileText}
        />
        <StatCard
          title="This Month"
          value={summary?.this_month ?? '—'}
          icon={Calendar}
          accent="blue"
        />
        <StatCard
          title="Total Revenue"
          value={summary ? fmtAmount(summary.total_revenue) : '—'}
          icon={IndianRupee}
          accent="green"
        />
        <StatCard
          title="Month Revenue"
          value={summary ? fmtAmount(summary.month_revenue) : '—'}
          icon={TrendingUp}
          accent="purple"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
        {data && (
          <span className="text-sm text-muted-foreground">{data.total} total</span>
        )}
      </div>

      {/* Table */}
      {isLoading && <LoadingSpinner />}
      {isError   && <ErrorState message="Failed to load invoices." />}

      {data && data.invoices.length === 0 && !isLoading && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No invoices yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Invoices are generated automatically when a member completes payment.
          </p>
        </div>
      )}

      {data && data.invoices.length > 0 && (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Invoice #</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Member</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Plan</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Payment Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Expiry</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">#{inv.id}</td>
                    <td className="px-4 py-2.5 font-medium">{inv.member?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{inv.member?.phone ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{inv.member?.plan_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-600">
                      {fmtAmount(inv.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(inv.updated_at)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(inv.member?.expiry_date)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1"
                        disabled={downloading === inv.id}
                        onClick={() => handleDownload(inv.id, inv.member?.name ?? 'member')}
                      >
                        <Download className="h-3 w-3" />
                        {downloading === inv.id ? 'Generating…' : 'PDF'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={offset + PAGE_SIZE >= data.total}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
