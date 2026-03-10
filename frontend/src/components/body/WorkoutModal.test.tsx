import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkoutModal } from './WorkoutModal';
import { Workout } from '@/types/workout';

vi.mock('@/lib/storage', () => ({
  storage: { get: vi.fn(() => []), set: vi.fn(), remove: vi.fn(), clear: vi.fn() },
  STORAGE_KEYS: { WORKOUT_TEMPLATES: 'beme_workout_templates' },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { units: 'metric', dateFormat: 'DD/MM/YYYY', theme: 'system' },
    updateSettings: vi.fn(),
  }),
}));

describe('WorkoutModal', () => {
  it('renders Add Workout form with N rep inputs when sets = N', () => {
    const onSave = vi.fn();
    render(
      <WorkoutModal open={true} onOpenChange={vi.fn()} onSave={onSave} />
    );

    expect(screen.getByRole('heading', { name: 'Add Workout' })).toBeInTheDocument();
    expect(screen.getByLabelText('Set 1 reps')).toBeInTheDocument();
    expect(screen.getByLabelText('Set 2 reps')).toBeInTheDocument();
    expect(screen.getByLabelText('Set 3 reps')).toBeInTheDocument();
  });

  it('shows more rep inputs when sets is increased', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <WorkoutModal open={true} onOpenChange={vi.fn()} onSave={onSave} />
    );

    const setsInputs = screen.getAllByPlaceholderText('3');
    const setsInput = setsInputs[0];
    await user.clear(setsInput);
    await user.type(setsInput, '4');

    await waitFor(() => {
      expect(screen.getByLabelText('Set 4 reps')).toBeInTheDocument();
    });
  });

  it('calls onSave with repsPerSet when filled and submitted', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <WorkoutModal open={true} onOpenChange={vi.fn()} onSave={onSave} />
    );

    await user.type(screen.getByPlaceholderText(/e.g. Squat/i), 'Bench Press');
    await user.type(screen.getByLabelText(/duration/i), '45');

    const set1Input = screen.getByLabelText('Set 1 reps');
    await user.clear(set1Input);
    await user.type(set1Input, '10');

    const submitButton = screen.getByRole('button', { name: /add workout/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    const saved = onSave.mock.calls[0][0];
    expect(saved.exercises).toHaveLength(1);
    expect(saved.exercises[0].repsPerSet).toBeDefined();
    expect(saved.exercises[0].repsPerSet).toHaveLength(3);
  });

  it('loads workout with repsPerSet into form', () => {
    const workout: Workout = {
      id: '1',
      date: new Date(2025, 0, 17),
      title: 'Chest Day',
      type: 'strength',
      durationMinutes: 60,
      exercises: [
        {
          name: 'Bench Press',
          sets: 3,
          reps: 10,
          repsPerSet: [10, 8, 6],
          weight: 135,
        },
      ],
    };

    render(
      <WorkoutModal open={true} onOpenChange={vi.fn()} onSave={vi.fn()} workout={workout} />
    );

    expect(screen.getByRole('heading', { name: 'Edit Workout' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bench Press')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
    expect(screen.getByDisplayValue('6')).toBeInTheDocument();
  });

  it('loads workout without repsPerSet using reps for each set', () => {
    const workout: Workout = {
      id: '2',
      date: new Date(2025, 0, 18),
      title: 'Leg Day',
      type: 'strength',
      durationMinutes: 45,
      exercises: [
        {
          name: 'Squat',
          sets: 4,
          reps: 10,
          weight: 225,
        },
      ],
    };

    render(
      <WorkoutModal open={true} onOpenChange={vi.fn()} onSave={vi.fn()} workout={workout} />
    );

    expect(screen.getByDisplayValue('Squat')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    expect(screen.getByLabelText('Set 1 reps')).toHaveValue(10);
    expect(screen.getByLabelText('Set 4 reps')).toBeInTheDocument();
  });
});
