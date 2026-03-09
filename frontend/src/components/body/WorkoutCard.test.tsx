import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkoutCard } from './WorkoutCard';
import { Workout } from '@/types/workout';

const mockWorkout: Workout = {
  id: '1',
  date: new Date(2025, 0, 16),
  title: 'Chest Day',
  type: 'strength',
  durationMinutes: 60,
  exercises: [
    { name: 'Bench Press', sets: 3, reps: 10, weight: 135 },
  ],
};

describe('WorkoutCard', () => {
  it('renders workout information', () => {
    render(<WorkoutCard workout={mockWorkout} />);
    expect(screen.getByText('Chest Day')).toBeInTheDocument();
    expect(screen.getByText('strength')).toBeInTheDocument();
    expect(screen.getByText(/Bench Press/)).toBeInTheDocument();
  });

  it('calls onEdit when clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<WorkoutCard workout={mockWorkout} onEdit={onEdit} />);
    
    await user.click(screen.getByText('Chest Day'));
    expect(onEdit).toHaveBeenCalledWith(mockWorkout);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<WorkoutCard workout={mockWorkout} onDelete={onDelete} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete workout/i });
    await user.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
