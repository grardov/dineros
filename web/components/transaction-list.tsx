"use client";

import { ArrowRightIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { CategoryChip, TransactionIcon, useCategory } from "@/components/category-icon";
import { capitalize, dayMonth } from "@/components/finance";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { signedMoney, type Transaction, type TransactionKind } from "@/lib/types";
import { cn } from "cn";

// Signed from the point of view of `accountId` when given: a transfer is money out of one account
// and into the other. Without it a transfer is neither, so it has no sign.
export function signed(t: Transaction, accountId?: string) {
  if (t.kind === "income") return t.amount;
  if (t.kind === "expense") return -t.amount;
  if (!accountId) return null;
  return t.to_account_id === accountId ? t.amount : -t.amount;
}

function dayLabel(iso: string, today: string) {
  const d = new Date(`${iso}T00:00:00`);
  const weekday = d.toLocaleDateString("es-MX", { weekday: "long" });
  const yesterday = new Date(`${today}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === today) return `Hoy · ${weekday} ${dayMonth(iso)}`;
  if (d.getTime() === yesterday.getTime()) return `Ayer · ${weekday} ${dayMonth(iso)}`;
  return `${capitalize(weekday)} ${dayMonth(iso)}`;
}

function Row({
  t,
  accountId,
  showDate,
  fresh,
  onSelect,
}: {
  t: Transaction;
  accountId?: string;
  showDate: boolean;
  fresh: boolean;
  onSelect: () => void;
}) {
  const store = useStore();
  const { category, parent } = useCategory(t.category_id);
  const account = store.account(t.account_id)!;
  const to = store.account(t.to_account_id);
  const amount = signed(t, accountId);
  const accountText = to ? `${account.name} → ${to.name}` : account.name;
  const title = t.description ?? category?.name ?? (t.kind === "transfer" ? "Transferencia" : "—");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 border-b border-muted px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-sidebar focus-visible:bg-accent focus-visible:outline-none md:px-[18px]",
        fresh && "animate-row-in",
      )}
    >
      <TransactionIcon
        transaction={t}
        className="size-9 rounded-[10px] md:size-8 md:rounded-[9px]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{title}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {showDate && <span>{dayMonth(t.occurred_on)}</span>}
          <span className="truncate @3xl:hidden">
            {t.kind === "transfer"
              ? accountText
              : `${parent ? `${parent.name} › ` : ""}${category?.name ?? "Sin categoría"} · ${account.name}`}
          </span>
          <span className="hidden flex-wrap items-center gap-2 @3xl:flex">
            {t.notes && <span className="truncate">{t.notes}</span>}
            {t.location_name && (
              <span className="inline-flex items-center gap-0.5">
                <MapPinIcon className="size-3" />
                {t.location_name}
              </span>
            )}
            {t.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex h-[18px] items-center rounded-[5px] bg-secondary px-1.5 text-[11px] text-sidebar-foreground"
              >
                #{tag}
              </span>
            ))}
          </span>
        </span>
      </div>
      <span className="hidden w-48 shrink-0 @3xl:block">
        {t.kind === "transfer" ? (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-transfer-soft px-2.5 text-[0.78rem] font-medium text-transfer">
            Transferencia
          </span>
        ) : (
          <CategoryChip categoryId={t.category_id} />
        )}
      </span>
      <span className="hidden w-40 shrink-0 items-center gap-1 truncate text-[0.8125rem] text-sidebar-foreground @3xl:flex">
        {account.name}
        {to && (
          <>
            <ArrowRightIcon className="size-3 shrink-0" /> {to.name}
          </>
        )}
      </span>
      <span
        className={cn(
          "shrink-0 text-right text-sm font-semibold tabular-nums @3xl:w-32",
          amount === null ? "text-transfer" : amount > 0 ? "text-income" : "text-expense",
        )}
      >
        {amount === null
          ? signedMoney(t.amount, account.currency, false)
          : signedMoney(amount, account.currency)}
      </span>
    </button>
  );
}

// Rows open the edit dialog. Grouped by day with each day's net, or flat with the date inline.
export function TransactionRows({
  transactions,
  accountId,
  grouped = true,
  empty = "Sin movimientos.",
}: {
  transactions: Transaction[];
  accountId?: string;
  grouped?: boolean;
  empty?: React.ReactNode;
}) {
  const store = useStore();
  const [editing, setEditing] = useState<Transaction | null>(null);
  // A row that wasn't here at first and was just created slides in. The margin absorbs clock skew
  // with the server; rows that only show up by changing month or filters were created earlier.
  const [seen] = useState(() => new Set(transactions.map((t) => t.id)));
  const fresh = (t: Transaction) =>
    !seen.has(t.id) && Date.parse(t.created_at) > store.loadedAt - 5 * 60_000;
  const dialog = editing && (
    <TransactionDialog transaction={editing} open onClose={() => setEditing(null)} />
  );

  if (!transactions.length)
    return typeof empty === "string" ? (
      <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>
    ) : (
      empty
    );

  if (!grouped)
    return (
      <div className="@container flex flex-col">
        {transactions.map((t) => (
          <Row
            key={t.id}
            t={t}
            accountId={accountId}
            showDate
            fresh={fresh(t)}
            onSelect={() => setEditing(t)}
          />
        ))}
        {dialog}
      </div>
    );

  const days = Map.groupBy(transactions, (t) => t.occurred_on);
  return (
    <div className="@container flex flex-col">
      {[...days].map(([day, rows]) => (
        <section key={day}>
          <h3 className="flex justify-between border-b border-muted bg-sidebar px-4 pt-2.5 pb-1.5 font-sans text-xs font-semibold text-sidebar-foreground md:px-[18px]">
            <span>{dayLabel(day, store.today)}</span>
            <span className="text-muted-foreground tabular-nums">
              {signedMoney(rows.reduce((s, t) => s + (signed(t, accountId) ?? 0), 0))}
            </span>
          </h3>
          {rows.map((t) => (
            <Row
              key={t.id}
              t={t}
              accountId={accountId}
              showDate={false}
              fresh={fresh(t)}
              onSelect={() => setEditing(t)}
            />
          ))}
        </section>
      ))}
      {dialog}
    </div>
  );
}

export function NewTransactionButton({
  kind,
  accountId,
  toAccountId,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  kind?: TransactionKind;
  accountId?: string;
  toAccountId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button {...props} onClick={() => setOpen(true)}>
        {children ?? (
          <>
            <PlusIcon /> Nuevo movimiento
          </>
        )}
      </Button>
      {open && (
        <TransactionDialog
          kind={kind}
          accountId={accountId}
          toAccountId={toAccountId}
          open
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
