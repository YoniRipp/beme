import { useMemo, useState } from 'react';
import { Transaction } from '@/types/transaction';
import { useSettings } from '@/hooks/useSettings';
import { useExchangeRates } from '@/features/money/useExchangeRates';
import { SearchBar } from '@/components/shared/SearchBar';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions } from '@/features/money/useTransactions';
import { useTransactionFilters } from '@/features/money/useTransactionFilters';
import { useBalanceByPeriod } from '@/features/money/useBalanceByPeriod';
import { TransactionCard } from '@/features/money/components/TransactionCard';
import { TransactionModal } from '@/features/money/components/TransactionModal';
import { MonthlyChart } from '@/features/money/components/MonthlyChart';
import { formatCurrency } from '@/lib/utils';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import type { BalancePeriod } from '@/features/money/useBalanceByPeriod';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

function groupTransactionsByDate(transactions: Transaction[]): { date: string; label: string; transactions: Transaction[] }[] {
  const byDate = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const d = format(new Date(t.date), 'yyyy-MM-dd');
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(t);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
  return sortedDates.map((dateStr) => {
    const d = parseISO(dateStr);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else label = format(d, 'EEEE, MMM d');
    return { date: dateStr, label, transactions: byDate.get(dateStr)! };
  });
}

const PERIOD_LABELS: Record<BalancePeriod, string> = {
  daily: 'Today',
  weekly: 'This week',
  monthly: 'This month',
  yearly: 'This year',
};

export function Money() {
  const {
    transactions,
    transactionsLoading,
    transactionsError,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const { settings } = useSettings();
  const displayCurrency = settings.currency;
  const fromCurrencies = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.currency ?? 'USD'))),
    [transactions]
  );
  const { convertToDisplay } = useExchangeRates(displayCurrency, fromCurrencies);
  const { selectedPeriod, setSelectedPeriod, selectedPeriodTransactions, balances } =
    useBalanceByPeriod(transactions, convertToDisplay);
  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    amountRange,
    setAmountRange,
    selectedCategories,
    toggleCategory,
    clearFilters,
    activeFiltersCount,
    allCategories,
    filteredTransactions,
  } = useTransactionFilters(transactions, selectedPeriodTransactions);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const balanceForPeriod = balances[selectedPeriod];

  const groupedByDate = useMemo(
    () => groupTransactionsByDate(filteredTransactions),
    [filteredTransactions]
  );

  const handleSave = (transaction: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transaction);
      toast.success('Transaction updated');
    } else {
      addTransaction(transaction);
      toast.success('Transaction added');
    }
    setEditingTransaction(undefined);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingTransaction(undefined);
    setModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Balance / summary at top (bank-style) */}
      <Card className="p-5 bg-muted/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Balance ({PERIOD_LABELS[selectedPeriod]})</p>
            <p
              className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                balanceForPeriod.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(balanceForPeriod.balance, displayCurrency)}
            </p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600">+{formatCurrency(balanceForPeriod.income, displayCurrency)}</span>
              <span className="text-red-600">−{formatCurrency(balanceForPeriod.expenses, displayCurrency)}</span>
            </div>
          </div>
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as BalancePeriod)} className="w-auto">
            <TabsList className="grid grid-cols-4 h-9">
              <TabsTrigger value="daily" className="text-xs">Day</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs">Week</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs">Month</TabsTrigger>
              <TabsTrigger value="yearly" className="text-xs">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <ContentWithLoading
        loading={transactionsLoading}
        loadingText="Loading transactions..."
        error={transactionsError}
        skeleton={
          <div className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="space-y-3 mt-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        {/* Search + filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search transactions..."
            />
          </div>
          <FilterDialog
            dateRange={dateRange}
            setDateRange={setDateRange}
            amountRange={amountRange}
            setAmountRange={setAmountRange}
            allCategories={allCategories}
            selectedCategories={selectedCategories}
            toggleCategory={toggleCategory}
            activeFiltersCount={activeFiltersCount}
            clearFilters={clearFilters}
          />
        </div>

        {/* Filter tabs: All / Income / Expenses */}
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as 'all' | 'income' | 'expense')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
          </TabsList>

          {/* Date-grouped transaction list */}
          <div className="mt-4 space-y-6">
            {groupedByDate.length === 0 ? (
              <Card
                className="p-8 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center"
                onClick={handleAddNew}
                role="button"
                tabIndex={0}
                aria-label="Add your first transaction"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAddNew();
                  }
                }}
              >
                <Plus className="w-12 h-12 mx-auto mb-3 text-muted-foreground" aria-hidden />
                <p className="text-lg font-medium mb-1">Add your first transaction</p>
                <p className="text-sm text-muted-foreground">Tap to start tracking your finances</p>
              </Card>
            ) : (
              <>
                {groupedByDate.map(({ date: dateStr, label, transactions: dayTransactions }) => (
                  <section key={dateStr}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background/95 py-1">
                      {label}
                    </h3>
                    <div className="space-y-2">
                      {dayTransactions.map((transaction) => (
                        <TransactionCard
                          key={transaction.id}
                          transaction={transaction}
                          convertedAmount={convertToDisplay ? convertToDisplay(transaction.amount, transaction.currency ?? 'USD') : undefined}
                          displayCurrency={displayCurrency}
                          onEdit={handleEdit}
                          onDelete={setDeleteConfirmId}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                <Card
                  className="p-6 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center bg-muted/50"
                  onClick={handleAddNew}
                  role="button"
                  tabIndex={0}
                  aria-label="Add another transaction"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleAddNew();
                    }
                  }}
                >
                  <Plus className="w-8 h-8 mx-auto text-primary" aria-hidden />
                  <p className="text-sm font-medium mt-2 text-muted-foreground">Add another transaction</p>
                </Card>
              </>
            )}
          </div>
        </Tabs>
      </ContentWithLoading>

      <MonthlyChart
        transactions={selectedPeriodTransactions}
        period={selectedPeriod}
        convertToDisplay={convertToDisplay}
      />

      <TransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        transaction={editingTransaction}
      />

      <ConfirmationDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Delete transaction"
        message="Are you sure you want to delete this transaction? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteTransaction(deleteConfirmId);
            toast.success('Transaction deleted');
          }
          setDeleteConfirmId(null);
        }}
      />
    </div>
  );
}

function FilterDialog({
  dateRange,
  setDateRange,
  amountRange,
  setAmountRange,
  allCategories,
  selectedCategories,
  toggleCategory,
  activeFiltersCount,
  clearFilters,
}: {
  dateRange: { start: string; end: string };
  setDateRange: (v: { start: string; end: string }) => void;
  amountRange: { min: string; max: string };
  setAmountRange: (v: { min: string; max: string }) => void;
  allCategories: string[];
  selectedCategories: string[];
  toggleCategory: (category: string) => void;
  activeFiltersCount: number;
  clearFilters: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Transactions</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date Range</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                placeholder="Start date"
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                placeholder="End date"
              />
            </div>
          </div>
          <div>
            <Label>Amount Range</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input
                type="number"
                value={amountRange.min}
                onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
                placeholder="Min amount"
              />
              <Input
                type="number"
                value={amountRange.max}
                onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
                placeholder="Max amount"
              />
            </div>
          </div>
          <div>
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {allCategories.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategories.includes(cat) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={clearFilters} className="w-full">
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
