'use client';

import { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import { memberApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  Download, ChevronRight, RotateCcw,
} from 'lucide-react';

// ─── System field definitions ─────────────────────────────────────────────────
const SYSTEM_FIELDS = [
  { key: 'name',              label: 'Full Name',        required: true  },
  { key: 'phone',             label: 'Phone',            required: true  },
  { key: 'plan_name',         label: 'Plan Name',        required: true  },
  { key: 'plan_amount',       label: 'Fee Amount',       required: true  },
  { key: 'join_date',         label: 'Joining Date',     required: true  },
  { key: 'expiry_date',       label: 'Expiry Date',      required: true  },
  { key: 'plan_duration_days',label: 'Duration (Days)',  required: false },
];

// ─── Auto-detect: normalize any naming convention to a single canonical token ──
//
// Strategy:
//  1. Split camelCase/PascalCase on uppercase boundaries  (planName → "plan name")
//  2. Replace all separators (_, -, ., spaces) with a single space
//  3. Lowercase + trim
//
// Examples — all collapse to the same token:
//   plan_name | planName | PlanName | plan-name | Plan Name | PLAN_NAME → "plan name"
//   join_date | joinDate | JoinDate | join-date | Join Date → "join date"

function canonicalize(s) {
  return String(s)
    .replace(/([a-z])([A-Z])/g, '$1 $2')   // camelCase → words
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ABCDef → ABC Def
    .replace(/[\s_\-\.]+/g, ' ')            // any separator → single space
    .toLowerCase()
    .trim();
}

// ─── Hint table (all entries are already in canonical "space-separated" form) ──
const DETECT_HINTS = {
  name: [
    'name', 'full name', 'member name', 'member', 'customer name', 'customer',
    'student name', 'client name', 'person name',
  ],
  phone: [
    'phone', 'mobile', 'contact', 'phone number', 'mobile number',
    'cell', 'cell number', 'number', 'mob', 'contact number', 'whatsapp',
  ],
  plan_name: [
    'plan', 'plan name', 'plan type', 'membership', 'membership plan',
    'package', 'scheme', 'subscription', 'subscription plan', 'program',
  ],
  plan_amount: [
    'amount', 'fee', 'price', 'plan amount', 'fee amount', 'membership fee',
    'cost', 'charges', 'rate', 'subscription fee', 'monthly fee', 'total',
  ],
  join_date: [
    'join date', 'joining date', 'start date', 'enrollment date',
    'from date', 'start', 'admission date', 'registration date', 'date of joining',
  ],
  expiry_date: [
    'expiry date', 'expiry', 'expiration date', 'expiration', 'end date',
    'valid till', 'valid until', 'to date', 'renewal date', 'due date',
    'validity date', 'membership expiry',
  ],
  plan_duration_days: [
    'duration', 'days', 'plan duration', 'duration days', 'validity',
    'validity days', 'period', 'plan days', 'membership duration',
  ],
};

// Pre-canonicalize all hints once at module load (performance)
const CANONICAL_HINTS = Object.fromEntries(
  Object.entries(DETECT_HINTS).map(([field, hints]) => [
    field,
    hints.map(canonicalize),
  ])
);

function autoDetect(csvHeaders) {
  const mapping      = {};
  const usedHeaders  = new Set(); // prevent same column from mapping to two fields

  for (const field of SYSTEM_FIELDS) {
    const hints = CANONICAL_HINTS[field.key];
    const match = csvHeaders.find((h) => {
      if (usedHeaders.has(h)) return false;
      return hints.includes(canonicalize(h));
    });
    mapping[field.key] = match || '';
    if (match) usedHeaders.add(match);
  }
  return mapping;
}

// ─── Row validation ───────────────────────────────────────────────────────────
function parseDate(v) {
  if (!v) return null;
  if (typeof v === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(v);
    if (!date) return null;
    return new Date(date.y, date.m - 1, date.d);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function validateRow(row) {
  const errors = [];
  if (!row.name || !String(row.name).trim()) errors.push('Name is required');
  const phone = String(row.phone || '').trim().replace(/\D/g, '');
  if (phone.length < 10) errors.push('Phone must be at least 10 digits');
  if (!row.plan_name || !String(row.plan_name).trim()) errors.push('Plan name is required');
  const amount = parseFloat(row.plan_amount);
  if (isNaN(amount) || amount < 0) errors.push('Fee amount must be a positive number');
  const join   = parseDate(row.join_date);
  if (!join) errors.push('Joining date is invalid');
  const expiry = parseDate(row.expiry_date);
  if (!expiry) errors.push('Expiry date is invalid');
  if (join && expiry && expiry < join) errors.push('Expiry date must be after joining date');
  return errors;
}

function applyMapping(rawRows, mapping) {
  return rawRows.map((raw, idx) => {
    const mapped = {};
    for (const field of SYSTEM_FIELDS) {
      const csvCol = mapping[field.key];
      mapped[field.key] = csvCol ? (raw[csvCol] ?? '') : '';
    }
    mapped._rowIndex = idx + 2; // 1=header, +1 for 1-based
    mapped._errors   = validateRow(mapped);
    mapped._valid    = mapped._errors.length === 0;
    return mapped;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return '';
  const d = parseDate(v);
  if (!d) return String(v);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ['Upload', 'Map Columns', 'Preview', 'Import'];

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const idx   = i + 1;
        const done  = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${done   ? 'bg-primary text-primary-foreground' : ''}
                ${active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                ${!done && !active ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : idx}
              </div>
              <span className={`text-xs ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 ${done ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const [step, setStep]           = useState(1);
  const [file, setFile]           = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);   // raw column names from file
  const [rawRows, setRawRows]     = useState([]);     // raw parsed rows
  const [mapping, setMapping]     = useState({});     // { systemField: csvColumn }
  const [mappedRows, setMappedRows] = useState([]);   // rows after mapping + validation
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);   // { imported, total, failed[] }
  const fileInputRef              = useRef(null);
  const qc                        = useQueryClient();

  // ── Step 1: parse file ──────────────────────────────────────────────────────
  function parseFile(f) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!data || data.length < 2) {
          toast.error('File is empty or has no data rows.');
          return;
        }
        const headers = data[0].map((h) => String(h).trim()).filter(Boolean);
        const rows    = data.slice(1).filter((r) => r.some((c) => c !== ''));
        // Convert array rows to object rows keyed by header
        const objRows = rows.map((r) => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
          return obj;
        });
        setCsvHeaders(headers);
        setRawRows(objRows);
        setMapping(autoDetect(headers));
        setStep(2);
      } catch {
        toast.error('Could not parse file. Please upload a valid .xlsx or .csv file.');
      }
    };
    reader.readAsArrayBuffer(f);
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    parseFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    parseFile(f);
  }

  // ── Step 2 → 3: apply mapping ───────────────────────────────────────────────
  function handleApplyMapping() {
    const rows = applyMapping(rawRows, mapping);
    setMappedRows(rows);
    setStep(3);
  }

  const requiredMapped = SYSTEM_FIELDS
    .filter((f) => f.required)
    .every((f) => mapping[f.key]);

  // ── Step 3 summary ──────────────────────────────────────────────────────────
  const validRows   = useMemo(() => mappedRows.filter((r) => r._valid),   [mappedRows]);
  const invalidRows = useMemo(() => mappedRows.filter((r) => !r._valid),  [mappedRows]);

  // ── Step 4: import ──────────────────────────────────────────────────────────
  async function handleImport() {
    setImporting(true);
    try {
      const members = validRows.map((r) => ({
        name:               String(r.name).trim(),
        phone:              String(r.phone).trim().replace(/\D/g, '').slice(-10),
        plan_name:          String(r.plan_name).trim(),
        plan_amount:        parseFloat(r.plan_amount),
        join_date:          parseDate(r.join_date)?.toISOString(),
        expiry_date:        parseDate(r.expiry_date)?.toISOString(),
        plan_duration_days: Math.max(1, parseInt(r.plan_duration_days || '30', 10) || 30),
      }));

      const res = await memberApi.bulkImport(members);
      const d   = res.data.data;

      // Merge frontend-rejected rows + backend-rejected rows into one failed list
      const frontendFailed = invalidRows.map((r) => ({
        row:    r._rowIndex,
        name:   String(r.name  || ''),
        phone:  String(r.phone || ''),
        reason: r._errors.join('; '),
      }));
      const allFailed = [...frontendFailed, ...d.failed];

      setResult({
        imported: d.imported,
        total:    mappedRows.length,       // true total = all rows from file
        failed:   allFailed,
      });

      if (d.imported > 0) {
        qc.invalidateQueries({ queryKey: ['members'] });
        qc.invalidateQueries({ queryKey: ['members-summary'] });
        toast.success(`${d.imported} members imported successfully.`);
      }
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  // ── Download failed rows ────────────────────────────────────────────────────
  function downloadFailed() {
    if (!result?.failed?.length) return;
    const headers = ['Row', 'Name', 'Phone', 'Reason'];
    const rows    = result.failed.map((f) => `"${f.row}","${f.name}","${f.phone}","${f.reason}"`);
    const csv     = [headers.join(','), ...rows].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'failed_rows.csv');
  }

  // ── Reset ───────────────────────────────────────────────────────────────────
  function reset() {
    setStep(1); setFile(null); setCsvHeaders([]); setRawRows([]);
    setMapping({}); setMappedRows([]); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold">Import Members</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload your Excel or CSV file and map columns to import members in bulk.
        </p>
      </div>

      <StepBar current={step} />

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div
            className="border-2 border-dashed rounded-xl p-14 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-all"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold text-lg">Click to upload or drag &amp; drop</p>
            <p className="text-sm text-muted-foreground mt-1">.xlsx, .xls, .csv — max 5 MB</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 text-sm space-y-2">
            <p className="font-semibold">Accepted column names (any order)</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                ['Name', 'Name / Full Name / Member'],
                ['Phone', 'Phone / Mobile / Contact'],
                ['Plan Name', 'Plan / PlanType / Membership'],
                ['Fee Amount', 'Amount / Fee / Price / Charges'],
                ['Join Date', 'Join Date / Start Date / From Date'],
                ['Expiry Date', 'Expiry / End Date / Valid Till'],
              ].map(([sys, examples]) => (
                <div key={sys} className="flex gap-1.5">
                  <code className="bg-muted rounded px-1 shrink-0">{sys}</code>
                  <span className="text-muted-foreground">{examples}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Column Mapping ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-lg border overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b">
              <p className="text-sm font-semibold">Map your columns to system fields</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Auto-detected from <span className="font-medium">{file?.name}</span> — adjust if needed
              </p>
            </div>
            <div className="divide-y">
              {SYSTEM_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-44 shrink-0">
                    <p className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">system field</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select
                    value={mapping[field.key] || '__none__'}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [field.key]: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="flex-1 h-9 text-sm">
                      <SelectValue placeholder="— not mapped —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— not mapped —</SelectItem>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping[field.key]
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    : field.required
                      ? <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      : <div className="h-4 w-4 shrink-0" />
                  }
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={reset}>Back</Button>
            <Button onClick={handleApplyMapping} disabled={!requiredMapped}>
              Preview Data
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Preview + Validation ── */}
      {step === 3 && (
        <div className="space-y-5">

          {/* Validation summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">{mappedRows.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Rows</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{validRows.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Valid</p>
            </div>
            <div className={`rounded-lg border p-4 text-center ${invalidRows.length > 0 ? 'border-red-200 bg-red-50' : 'border-muted'}`}>
              <p className={`text-2xl font-bold ${invalidRows.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{invalidRows.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Invalid</p>
            </div>
          </div>

          {/* Preview table — first 10 rows */}
          <div>
            <p className="text-sm font-semibold mb-2">
              Preview <span className="text-muted-foreground font-normal">(first 10 rows)</span>
            </p>
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Phone</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Plan</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Join Date</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Expiry</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mappedRows.slice(0, 10).map((row) => (
                    <tr key={row._rowIndex} className={row._valid ? '' : 'bg-red-50'}>
                      <td className="px-3 py-2 text-muted-foreground">{row._rowIndex}</td>
                      <td className="px-3 py-2 font-medium">{String(row.name || '—')}</td>
                      <td className="px-3 py-2">{String(row.phone || '—')}</td>
                      <td className="px-3 py-2">{String(row.plan_name || '—')}</td>
                      <td className="px-3 py-2 text-right">{row.plan_amount ? `₹${row.plan_amount}` : '—'}</td>
                      <td className="px-3 py-2">{fmtDate(row.join_date)  || '—'}</td>
                      <td className="px-3 py-2">{fmtDate(row.expiry_date) || '—'}</td>
                      <td className="px-3 py-2">
                        {row._valid
                          ? <span className="text-green-600 font-medium">✓ Valid</span>
                          : <span className="text-red-500 font-medium" title={row._errors.join('; ')}>✗ {row._errors[0]}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mappedRows.length > 10 && (
                <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/10">
                  + {mappedRows.length - 10} more rows not shown
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={handleImport} disabled={validRows.length === 0 || importing}>
              {importing ? 'Importing…' : `Import ${validRows.length} Valid Members`}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Result ── */}
      {step === 4 && result && (
        <div className="space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">{result.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Rows</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{result.imported}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Imported</p>
            </div>
            <div className={`rounded-lg border p-4 text-center ${result.failed.length > 0 ? 'border-red-200 bg-red-50' : 'border-muted'}`}>
              <p className={`text-2xl font-bold ${result.failed.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{result.failed.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Failed</p>
            </div>
          </div>

          {result.imported > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {result.imported} members have been added/updated in the system.
            </div>
          )}

          {/* Failed rows table */}
          {result.failed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-red-600">Failed Rows ({result.failed.length})</p>
                <Button size="sm" variant="outline" onClick={downloadFailed}>
                  <Download className="h-3 w-3 mr-1" />
                  Download Failed Rows
                </Button>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Phone</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.failed.map((f) => (
                      <tr key={f.row} className="bg-red-50/50">
                        <td className="px-3 py-2 font-mono">{f.row}</td>
                        <td className="px-3 py-2">{f.name || '—'}</td>
                        <td className="px-3 py-2">{f.phone || '—'}</td>
                        <td className="px-3 py-2 text-red-600">{f.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Import Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
