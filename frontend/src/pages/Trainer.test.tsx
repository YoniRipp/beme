/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Trainer from './Trainer';
import type { TrainerAnalytics, TrainerAnalyticsRange, TrainerClient } from '@/core/api/trainer';

const useTrainerAnalyticsMock = vi.fn();

vi.mock('recharts', () => {
  const Chart = () => <div data-testid="chart" />;
  const Primitive = () => null;
  return {
    Area: Primitive,
    AreaChart: Chart,
    Bar: Primitive,
    BarChart: Chart,
    CartesianGrid: Primitive,
    ComposedChart: Chart,
    ResponsiveContainer: Chart,
    Tooltip: Primitive,
    XAxis: Primitive,
    YAxis: Primitive,
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    user: { id: 'trainer-1', name: 'Maya Coach', email: 'maya@example.com', role: 'trainer' },
  }),
}));

vi.mock('@/hooks/useTrainer', () => ({
  useTrainerClients: () => ({ data: trainerClients, isLoading: false }),
  useTrainerInvitations: () => ({ data: [], isLoading: false }),
  useTrainerAnalytics: (range: TrainerAnalyticsRange) => useTrainerAnalyticsMock(range),
  useInviteByEmail: () => ({ mutate: vi.fn(), isPending: false }),
  useGenerateInviteCode: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveClient: () => ({ mutate: vi.fn(), isPending: false }),
}));

let trainerClients: TrainerClient[] = [];

const analytics: TrainerAnalytics = {
  range: '30d',
  summary: {
    totalTrainees: 4,
    newTrainees: 1,
    engagedPercent: 50,
    atRiskCount: 1,
  },
  engagementSeries: [
    { label: 'W1', startDate: '2026-04-01', endDate: '2026-04-07', activeTrainees: 2, engagementPercent: 50 },
  ],
  growthSeries: [
    { label: 'W1', startDate: '2026-04-01', endDate: '2026-04-07', totalTrainees: 4, newTrainees: 1 },
  ],
  subscriptionAgeBuckets: [
    { label: '0-30d', count: 1 },
    { label: '31-90d', count: 2 },
    { label: '3-6m', count: 1 },
    { label: '6-12m', count: 0 },
    { label: '1y+', count: 0 },
  ],
  progress: {
    weightDeltaAvg: -1.2,
    calorieAverage: 2150,
    calorieTrendPercent: 4,
    volumeTotal: 12400,
    volumeTrendPercent: 11,
    volumeKind: 'weighted',
    series: [
      { label: 'W1', startDate: '2026-04-01', endDate: '2026-04-07', weightDeltaAvg: -1.2, calorieAverage: 2150, volume: 12400 },
    ],
  },
  roster: [
    {
      clientId: 'client-new',
      clientName: 'Ari New',
      clientEmail: 'ari@example.com',
      status: 'new',
      subscriptionAgeDays: 8,
      lastActivityAt: '2026-05-02T10:00:00.000Z',
      weightDelta: -0.4,
      calorieAverage: 2050,
      volumeTrendPercent: 6,
      volumeKind: 'weighted',
    },
    {
      clientId: 'client-good',
      clientName: 'Dana Good',
      clientEmail: 'dana@example.com',
      status: 'good',
      subscriptionAgeDays: 72,
      lastActivityAt: '2026-05-01T10:00:00.000Z',
      weightDelta: -1.1,
      calorieAverage: 2200,
      volumeTrendPercent: 12,
      volumeKind: 'weighted',
    },
    {
      clientId: 'client-attention',
      clientName: 'Lee Attention',
      clientEmail: 'lee@example.com',
      status: 'attention',
      subscriptionAgeDays: 120,
      lastActivityAt: '2026-04-24T10:00:00.000Z',
      weightDelta: 0.2,
      calorieAverage: 2400,
      volumeTrendPercent: -3,
      volumeKind: 'set_reps',
    },
    {
      clientId: 'client-risk',
      clientName: 'Noa Risk',
      clientEmail: 'noa@example.com',
      status: 'at_risk',
      subscriptionAgeDays: 310,
      lastActivityAt: null,
      weightDelta: null,
      calorieAverage: null,
      volumeTrendPercent: null,
      volumeKind: 'set_reps',
    },
  ],
};

function renderTrainer() {
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Trainer />
    </BrowserRouter>
  );
}

describe('Trainer page', () => {
  beforeEach(() => {
    trainerClients = analytics.roster.map((client) => ({
      id: client.clientId,
      trainerId: 'trainer-1',
      clientId: client.clientId,
      clientName: client.clientName,
      clientEmail: client.clientEmail,
      status: 'active',
      createdAt: '2026-04-01T00:00:00.000Z',
    }));
    useTrainerAnalyticsMock.mockReturnValue({ data: analytics, isLoading: false });
  });

  it('switches analytics range when a range tab is selected', async () => {
    const user = userEvent.setup();
    renderTrainer();

    expect(useTrainerAnalyticsMock).toHaveBeenCalledWith('30d');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '3M' }));
    });

    await waitFor(() => expect(useTrainerAnalyticsMock).toHaveBeenLastCalledWith('3m'));
  });

  it('shows roster status pills for every engagement state', () => {
    renderTrainer();

    expect(screen.getAllByText('New').length).toBeGreaterThan(0);
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getAllByText('At risk').length).toBeGreaterThan(0);
  });

  it('shows an empty state when the trainer has no trainees', () => {
    trainerClients = [];
    useTrainerAnalyticsMock.mockReturnValue({ data: { ...analytics, roster: [], summary: { ...analytics.summary, totalTrainees: 0 } }, isLoading: false });

    renderTrainer();

    expect(screen.getByText('No trainees yet')).toBeInTheDocument();
    expect(screen.getByText(/invite your first client/i)).toBeInTheDocument();
  });
});
