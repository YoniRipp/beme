import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, isAfter } from 'date-fns';
import { LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useExchangeRates } from '@/features/money/useExchangeRates';
import { getGreeting, formatDate } from '@/lib/utils';
import { HeaderBalance } from './HeaderBalance';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

export function TopBar() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { logout } = useAuth();
  const { settings } = useSettings();
  const { transactions, transactionsLoading } = useTransactions();
  const displayCurrency = settings.currency;
  const fromCurrencies = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.currency ?? 'USD'))),
    [transactions]
  );
  const { convertToDisplay } = useExchangeRates(displayCurrency, fromCurrencies);
  const greeting = getGreeting();

  const { balance, income, expenses } = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const monthly = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return isAfter(tDate, monthStart) && isAfter(monthEnd, tDate);
    });
    const monthlyIncome = monthly
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + convertToDisplay(t.amount, t.currency ?? 'USD'), 0);
    const monthlyExpenses = monthly
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + convertToDisplay(t.amount, t.currency ?? 'USD'), 0);
    return {
      balance: monthlyIncome - monthlyExpenses,
      income: monthlyIncome,
      expenses: monthlyExpenses,
    };
  }, [transactions, convertToDisplay]);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-background border-b border-border px-4 py-3">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="shrink-0" />
          <Link to="/" className="shrink-0 flex items-center" aria-label="BeMe home">
            <img src="/logo.png" alt="BeMe" className="h-8 w-auto object-contain" />
          </Link>
          <div className="border-l border-border pl-4">
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h2 className="text-xl font-bold">{user.name}</h2>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatDate(new Date(), settings.dateFormat)}
          </p>
          <div className="flex items-center gap-3">
            <HeaderBalance
              balance={balance}
              income={income}
              expenses={expenses}
              currency={settings.currency}
              balanceDisplayLayout={settings.balanceDisplayLayout}
              loading={transactionsLoading}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
