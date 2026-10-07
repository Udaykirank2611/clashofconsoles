import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileSpreadsheet, FileText, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  addExpense,
  deleteExpense,
  deleteTransaction,
  getTransactions,
  addDeposit,
  deleteDeposit,
  updateTransaction,
} from "@/lib/transactions.functions";
import type { TransactionRow, TransactionsPayload } from "@/lib/transactions/types";
import { formatDuration, inr } from "@/lib/reporting/format";
import { AdminButton, Panel, StatCard } from "../primitives";
import { exportTransactionsCsv, exportTransactionsPdf, exportTransactionsXlsx } from "./exports";
import { cn } from "@/lib/utils";
import { ModalPortal } from "../ModalPortal";

const field =
  "rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs outline-none focus:border-cyan/50";
const box =
  "w-full rounded-2xl border border-border bg-surface/70 px-3 py-2 text-xs outline-none focus:border-cyan/50";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PROVIDERS = [
  ["", "—"],
  ["phonepe", "PhonePe"],
  ["google_pay", "Google Pay"],
  ["paytm", "Paytm"],
  ["other", "Other"],
] as const;
const STATUSES = ["pending", "completed", "cancelled", "refunded"] as const;
const SOURCES = [
  ["website", "Website"],
  ["walk_in", "Walk-in"],
  ["membership", "Membership"],
  ["coupon", "Coupon"],
] as const;

export function TransactionsView({
  branches,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  defaultBranchId: string | null;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  useEffect(() => setBranchId(defaultBranchId ?? branches[0]?.id ?? ""), [defaultBranchId, branches]);
  const [from, setFrom] = useState(() => iso(new Date()));
  const [to, setTo] = useState(() => iso(new Date()));
  const [data, setData] = useState<TransactionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TransactionRow | null>(null);

  const [fSearch, setFSearch] = useState("");
  const [fCustomer, setFCustomer] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fMode, setFMode] = useState("all");
  const [fService, setFService] = useState("all");
  const [fConsole, setFConsole] = useState("all");
  const [fSource, setFSource] = useState("all");

  const fetchData = useServerFn(getTransactions);
  const saveTx = useServerFn(updateTransaction);
  const removeTx = useServerFn(deleteTransaction);
  const createExpense = useServerFn(addExpense);
  const removeExpense = useServerFn(deleteExpense);
  const createDeposit = useServerFn(addDeposit);
  const removeDeposit = useServerFn(deleteDeposit);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchData({
      data: { branchId: branchId === "all" ? null : branchId, from, to },
    });
    setData(res);
    setLoading(false);
  }, [branchId, from, to, fetchData]);

  useEffect(() => {
    void load();
  }, [load]);

  const services = useMemo(
    () => [...new Set((data?.rows ?? []).map((r) => r.service))].sort(),
    [data],
  );
  const consoles = useMemo(
    () => [...new Set((data?.rows ?? []).map((r) => r.consoleName))].sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const rows = data?.rows ?? [];
    return rows.filter(
      (r) =>
        (!fSearch.trim() ||
          [r.reference, r.customer, r.phone].some((v) =>
            (v ?? "").toLowerCase().includes(fSearch.trim().toLowerCase()),
          )) &&
        (!fCustomer || r.customer.toLowerCase().includes(fCustomer.toLowerCase())) &&
        (!fPhone || r.phone.includes(fPhone)) &&
        (fMode === "all" || r.paymentMode === fMode) &&
        (fService === "all" || r.service === fService) &&
        (fConsole === "all" || r.consoleName === fConsole) &&
        (fSource === "all" || r.source === fSource),
    );
  }, [data, fSearch, fCustomer, fPhone, fMode, fService, fConsole, fSource]);

  const exportPayload: TransactionsPayload | null = data ? { ...data, rows: filtered } : null;

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={field}>
            {branches.length > 1 ? <option value="all">All branches</option> : null}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
          <input
            value={fCustomer}
            onChange={(e) => setFCustomer(e.target.value)}
            placeholder="Customer name"
            className={field}
          />
          <input
            value={fPhone}
            onChange={(e) => setFPhone(e.target.value)}
            placeholder="Phone number"
            className={field}
          />
          <select value={fMode} onChange={(e) => setFMode(e.target.value)} className={field}>
            <option value="all">All payment modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="mixed">Cash + UPI</option>

          </select>
          <select value={fService} onChange={(e) => setFService(e.target.value)} className={field}>
            <option value="all">All services</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={fConsole} onChange={(e) => setFConsole(e.target.value)} className={field}>
            <option value="all">All consoles</option>
            {consoles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={fSource} onChange={(e) => setFSource(e.target.value)} className={field}>
            <option value="all">All booking types</option>
            {SOURCES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <AdminButton onClick={() => void load()}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
          </AdminButton>
          <span className="grow" />
          <AdminButton variant="download" onClick={() => exportPayload && exportTransactionsPdf(exportPayload)}>
            <FileText className="size-3.5" /> PDF
          </AdminButton>
          <AdminButton variant="download" onClick={() => exportPayload && void exportTransactionsXlsx(exportPayload)}>
            <FileSpreadsheet className="size-3.5" /> Excel
          </AdminButton>
          <AdminButton variant="download" onClick={() => exportPayload && exportTransactionsCsv(exportPayload)}>
            <Download className="size-3.5" /> CSV
          </AdminButton>
        </div>
      </Panel>

      {loading || !data ? (
        <Panel>
          <p className="py-10 text-center text-sm text-muted-foreground">Loading transactions…</p>
        </Panel>
      ) : (
        <>
          <Panel title="Daily totals">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="🎮 Gaming revenue" value={inr(data.totals.gamingRevenue)} tone="good" labelClassName="font-bold" />
              <StatCard label="🍔 Food revenue" value={inr(data.totals.foodRevenue)} tone="good" labelClassName="font-bold" />
              <StatCard label="🏷️ Total discounts" value={inr(data.totals.totalDiscounts)} tone="warn" labelClassName="font-bold" />
              <StatCard label="💰 Total revenue" value={inr(data.totals.totalRevenue)} tone="good" labelClassName="font-bold" />
              <StatCard label="💵 Cash collection" value={inr(data.totals.cashCollection)} tone="good" labelClassName="font-bold" />
              <StatCard label="📱 UPI collection" value={inr(data.totals.upiCollection)} tone="good" labelClassName="font-bold" />
              <StatCard label="🧾 Total bookings" value={data.totals.totalBookings} labelClassName="font-bold" />
              <StatCard label="⏱️ Total gaming hours" value={`${data.totals.totalGamingHours} hrs`} labelClassName="font-bold" />
            </div>
          </Panel>

          <Panel title="Transactions">
            <div className="mb-4">
              <input
                value={fSearch}
                onChange={(e) => setFSearch(e.target.value)}
                placeholder="Search booking ID, customer name or phone"
                aria-label="Search transactions"
                className="w-full max-w-md rounded-2xl border border-border bg-surface/70 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-cyan/50"
              />
            </div>
            {!filtered.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No transactions for this selection.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[2400px] text-left text-[0.82rem]">
                  <thead className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-foreground">
                    <tr className="border-b-2 border-pink/40 bg-surface-2/80">
                      {[
                        "S.No",
                        "Date",
                        "Booking ID",
                        "Customer",
                        "Phone",
                        "Branch",
                        "Service",
                        "Console",
                        "Check-in",
                        "Check-out",
                        "Duration",
                        "Players",
                        "Level",
                        "Gaming",
                        "Food",
                        "Membership disc.",
                        "Last-min disc.",
                        "Coupon disc.",
                        "Coupon code",
                        "Student disc.",
                        "Total disc.",
                        "Final",
                        "Mode",
                        "UPI provider",
                        "Cash",
                        "UPI",
                        "Status",
                        "Type",
                        "Notes",
                        "",
                      ].map((h) => (
                        <th key={h} className="whitespace-nowrap px-2 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr
                        key={r.id}
                        className={cn(
                          "relative origin-left border-t border-border/60 align-middle transition-all duration-200 motion-reduce:transition-none",
                          "hover:z-10 hover:scale-x-[1.005] hover:scale-y-[1.08] hover:bg-pink hover:[&>td]:bg-pink hover:[&>td]:text-primary-foreground hover:shadow-[inset_0_0_0_1px_var(--pink)] motion-reduce:hover:scale-100",
                          i % 2 ? "bg-surface/40" : "",
                        )}
                      >
                        <td className="px-2 py-3 font-semibold">{i + 1}</td>
                        <td className="whitespace-nowrap px-2">{r.date}</td>
                        <td className="whitespace-nowrap px-2 font-black tracking-wide text-foreground">
                          {r.reference}
                        </td>
                        <td className="whitespace-nowrap px-2 font-semibold">{r.customer}</td>
                        <td className="whitespace-nowrap px-2">{r.phone}</td>
                        <td className="whitespace-nowrap px-2">{r.branch}</td>
                        <td className="whitespace-nowrap px-2 font-bold">{r.service}</td>
                        <td className="whitespace-nowrap px-2 font-bold">{r.consoleName}</td>
                        <td className="px-2">{r.checkIn?.slice(0, 5) ?? "—"}</td>
                        <td className="px-2">{r.checkOut?.slice(0, 5) ?? "—"}</td>
                        <td className="whitespace-nowrap px-2">{formatDuration(r.durationMinutes)}</td>
                        <td className="px-2">{r.players}</td>
                        <td className="whitespace-nowrap px-2">{r.visitNumber || "—"}</td>
                        <td className="px-2">{inr(r.gamingAmount)}</td>
                        <td className="px-2">{inr(r.foodAmount)}</td>
                        <td className="px-2">{inr(r.membershipDiscount)}</td>
                        <td className="px-2">{inr(r.lastMinuteDiscount)}</td>
                        <td className="px-2">{inr(r.couponDiscount)}</td>
                        <td className="whitespace-nowrap px-2 font-semibold uppercase">{r.couponCode || "—"}</td>
                        <td className="px-2">{inr(r.studentDiscount)}</td>
                        <td className="px-2">{inr(r.totalDiscount)}</td>
                        <td className="px-2 font-black">{inr(r.finalAmount)}</td>
                        <td className="px-2 font-semibold uppercase">{r.paymentMode || "—"}</td>
                        <td className="px-2">
                          {PROVIDERS.find(([v]) => v === (r.upiProvider ?? ""))?.[1] ?? "—"}
                        </td>
                        <td className="px-2">{inr(r.cashAmount)}</td>
                        <td className="px-2">{inr(r.upiAmount)}</td>
                        <td className="px-2 font-semibold capitalize">{r.status}</td>
                        <td className="px-2">{SOURCES.find(([v]) => v === r.source)?.[1] ?? r.source}</td>
                        <td className="max-w-[200px] truncate px-2 text-muted-foreground">{r.notes}</td>
                        <td className="px-2 text-right">
                          <AdminButton onClick={() => setEditing(r)}>Edit</AdminButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <ExpensesPanel
            payload={data}
            branchId={branchId === "all" ? "" : branchId}
            date={from}
            onAdd={async (input) => {
              const res = await createExpense({ data: input });
              if (!res.ok) {
                toast.error(res.message ?? "Could not save the expense.");
                return;
              }
              toast.success("Expense added.");
              void load();
            }}
            onDelete={async (id) => {
              const res = await removeExpense({ data: { id } });
              if (!res.ok) {
                toast.error(res.message ?? "Could not delete the expense.");
                return;
              }
              void load();
            }}
          />

          <DepositsPanel
            payload={data}
            branchId={branchId === "all" ? "" : branchId}
            date={from}
            onAdd={async (input) => {
              const res = await createDeposit({ data: input });
              if (!res.ok) {
                toast.error(res.message ?? "Could not save the deposit.");
                return;
              }
              toast.success("Deposit added.");
              void load();
            }}
            onDelete={async (id) => {
              const res = await removeDeposit({ data: { id } });
              if (!res.ok) {
                toast.error(res.message ?? "Could not delete the deposit.");
                return;
              }
              void load();
            }}
          />

          <CashBankPanel payload={data} />
        </>
      )}

      {editing ? (
        <EditDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            const res = await saveTx({
              data: {
                bookingId: editing.bookingId,
                branchId: editing.branchId,
                status: patch.status,
                source: patch.source,
                upiProvider: patch.upiProvider,
                cashAmount: patch.cashAmount,
                upiAmount: patch.upiAmount,
                notes: patch.notes,
              },
            });
            if (!res.ok) {
              toast.error(res.message ?? "Could not save.");
              return;
            }
            toast.success("Transaction updated.");
            setEditing(null);
            void load();
          }}
          onDelete={async () => {
            if (
              !window.confirm(
                `Delete ${editing.reference}? It will be voided and removed from all reports, analytics and reconciliation.`,
              )
            )
              return;
            const res = await removeTx({
              data: { bookingId: editing.bookingId, branchId: editing.branchId },
            });
            if (!res.ok) {
              toast.error(res.message ?? "Could not delete this transaction.");
              return;
            }
            toast.success("Transaction deleted everywhere.");
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function ExpensesPanel({
  payload,
  branchId,
  date,
  onAdd,
  onDelete,
}: {
  payload: TransactionsPayload;
  branchId: string;
  date: string;
  onAdd: (input: {
    branchId: string;
    date: string;
    name: string;
    amount: number;
    description: string;
    time: string;
    paidFrom: "cash" | "bank";
  }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [paidFrom, setPaidFrom] = useState<"cash" | "bank">("cash");

  return (
    <Panel title={`Daily expenses · ${inr(payload.totalExpenses)}`}>
      {branchId ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-6">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Expense name" className={box} />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            inputMode="numeric"
            className={box}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className={cn(box, "sm:col-span-2")}
          />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={box} />
          <div className="flex gap-2">
            <select
              value={paidFrom}
              onChange={(e) => setPaidFrom(e.target.value as "cash" | "bank")}
              className={box}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
            <AdminButton
              variant="primary"
              onClick={() => {
                if (!name.trim()) {
                  toast.error("Add an expense name.");
                  return;
                }
                void onAdd({
                  branchId,
                  date,
                  name: name.trim(),
                  amount: Number(amount) || 0,
                  description,
                  time,
                  paidFrom,
                }).then(() => {
                  setName("");
                  setAmount("");
                  setDescription("");
                });
              }}
            >
              <Plus className="size-3.5" />
            </AdminButton>
          </div>
        </div>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">Select a single branch to add expenses.</p>
      )}

      {!payload.expenses.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No expenses recorded.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto px-2">
        <table className="w-full min-w-[640px] text-left text-xs whitespace-nowrap">
          <thead className="text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="py-2">Date</th>
              <th>Time</th>
              <th>Expense</th>
              <th>Description</th>
              <th>Paid from</th>
              <th className="text-right">Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {payload.expenses.map((e) => (
              <tr key={e.id} className="border-t border-border/60">
                <td className="py-2">{e.date}</td>
                <td>{e.time}</td>
                <td className="font-semibold">{e.name}</td>
                <td className="text-muted-foreground">{e.description}</td>
                <td className="capitalize">{e.paidFrom}</td>
                <td className="text-right font-semibold">{inr(e.amount)}</td>
                <td className="text-right">
                  <AdminButton onClick={() => void onDelete(e.id)}>
                    <Trash2 className="size-3.5" />
                  </AdminButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </Panel>
  );
}

function DepositsPanel({
  payload,
  branchId,
  date,
  onAdd,
  onDelete,
}: {
  payload: TransactionsPayload;
  branchId: string;
  date: string;
  onAdd: (input: {
    branchId: string;
    date: string;
    name: string;
    amount: number;
    description: string;
    time: string;
    depositTo: "cash" | "bank";
  }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [depositTo, setDepositTo] = useState<"cash" | "bank">("cash");

  return (
    <Panel title={`Deposits · ${inr(payload.totalDeposits)}`}>
      {branchId ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-6">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Deposit name" className={box} />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            inputMode="numeric"
            className={box}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className={cn(box, "sm:col-span-2")}
          />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={box} />
          <div className="flex gap-2">
            <select
              value={depositTo}
              onChange={(e) => setDepositTo(e.target.value as "cash" | "bank")}
              className={box}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
            <AdminButton
              variant="primary"
              onClick={() => {
                if (!name.trim()) {
                  toast.error("Add a deposit name.");
                  return;
                }
                void onAdd({
                  branchId,
                  date,
                  name: name.trim(),
                  amount: Number(amount) || 0,
                  description,
                  time,
                  depositTo,
                }).then(() => {
                  setName("");
                  setAmount("");
                  setDescription("");
                });
              }}
            >
              <Plus className="size-3.5" />
            </AdminButton>
          </div>
        </div>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">Select a single branch to add deposits.</p>
      )}

      {!payload.deposits.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No deposits recorded.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto px-2">
        <table className="w-full min-w-[640px] text-left text-xs whitespace-nowrap">
          <thead className="text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="py-2">Date</th>
              <th>Time</th>
              <th>Deposit</th>
              <th>Description</th>
              <th>Added to</th>
              <th className="text-right">Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {payload.deposits.map((d) => (
              <tr key={d.id} className="border-t border-border/60">
                <td className="py-2">{d.date}</td>
                <td>{d.time}</td>
                <td className="font-semibold">{d.name}</td>
                <td className="text-muted-foreground">{d.description}</td>
                <td className="capitalize">{d.depositTo}</td>
                <td className="text-right font-semibold">{inr(d.amount)}</td>
                <td className="text-right">
                  <AdminButton onClick={() => void onDelete(d.id)}>
                    <Trash2 className="size-3.5" />
                  </AdminButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </Panel>
  );
}

function CashBankPanel({ payload }: { payload: TransactionsPayload }) {
  const c = payload.cashBank;

  return (
    <Panel title="Bank & cash summary">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Opening cash" value={inr(c.openingCash)} labelClassName="font-bold" />
        <StatCard label="Opening bank" value={inr(c.openingBank)} labelClassName="font-bold" />
        <StatCard label="Cash received today" value={inr(c.cashReceived)} tone="good" labelClassName="font-bold" />
        <StatCard label="UPI received today" value={inr(c.upiReceived)} tone="good" labelClassName="font-bold" />
        <StatCard label="Deposited to cash" value={inr(c.depositsCash)} tone="good" labelClassName="font-bold" />
        <StatCard label="Deposited to bank" value={inr(c.depositsBank)} tone="good" labelClassName="font-bold" />
        <StatCard label="Expenses paid in cash" value={inr(c.expensesCash)} tone="warn" labelClassName="font-bold" />
        <StatCard label="Expenses paid by bank" value={inr(c.expensesBank)} tone="warn" labelClassName="font-bold" />
        <StatCard label="Closing cash balance" value={inr(c.closingCash)} labelClassName="font-bold" />
        <StatCard label="Closing bank balance" value={inr(c.closingBank)} labelClassName="font-bold" />
        <StatCard label="Avg balance" value={inr(c.avgBalance)} labelClassName="font-bold" />
        <StatCard label="Avg revenue" value={inr(c.avgRevenue)} labelClassName="font-bold" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Opening balances carry forward automatically from the previous day&apos;s closing balance, so they
        cannot be edited. Use Deposits to add money and Daily expenses to take money out — an entry dated
        before today updates today&apos;s opening balance too.
      </p>
    </Panel>
  );
}

function EditDialog({
  row,
  onClose,
  onSave,
  onDelete,
}: {
  row: TransactionRow;
  onClose: () => void;
  onSave: (patch: {
    status: (typeof STATUSES)[number];
    source: (typeof SOURCES)[number][0];
    upiProvider: "phonepe" | "google_pay" | "paytm" | "other" | null;
    cashAmount: number;
    upiAmount: number;
    notes: string;
  }) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>(row.status);
  const [source, setSource] = useState<(typeof SOURCES)[number][0]>(row.source);
  const [provider, setProvider] = useState<string>(row.upiProvider ?? "");
  const [cash, setCash] = useState(String(row.cashAmount));
  const [upi, setUpi] = useState(String(row.upiAmount));
  const [notes, setNotes] = useState(row.notes);

  return (
    <ModalPortal onClose={onClose}>
      <Panel className="mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto">
        <h3 className="text-sm font-black tracking-tight">{row.reference}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.customer} · {row.service} · {inr(row.finalAmount)}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
              className={cn(box, "mt-1 capitalize")}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            Booking type
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as (typeof SOURCES)[number][0])}
              className={cn(box, "mt-1")}
            >
              {SOURCES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            UPI provider
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className={cn(box, "mt-1")}>
              {PROVIDERS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            Cash received
            <input value={cash} onChange={(e) => setCash(e.target.value)} className={cn(box, "mt-1")} />
          </label>
          <label className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            UPI received
            <input value={upi} onChange={(e) => setUpi(e.target.value)} className={cn(box, "mt-1")} />
          </label>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Admin notes"
          className={cn(box, "mt-3")}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            variant="primary"
            onClick={() =>
              void onSave({
                status,
                source,
                upiProvider: provider ? (provider as "phonepe" | "google_pay" | "paytm" | "other") : null,
                cashAmount: Number(cash) || 0,
                upiAmount: Number(upi) || 0,
                notes,
              })
            }
          >
            Save
          </AdminButton>
          <AdminButton variant="danger" className="ml-auto" onClick={() => void onDelete()}>
            <Trash2 className="size-3.5" /> Delete
          </AdminButton>
        </div>
      </Panel>
    </ModalPortal>
  );
}
