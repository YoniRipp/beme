import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input with placeholder', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} placeholder="Search items..." />);
    expect(screen.getByPlaceholderText(/search items/i)).toBeInTheDocument();
  });

  it('calls onChange with debounced value', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} debounceMs={100} />);
    onChange.mockClear(); // Clear initial call with '' from mount

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    await waitFor(
      () => {
        expect(onChange).toHaveBeenCalledWith('test');
      },
      { timeout: 500 }
    );
    vi.useFakeTimers();
  });

  it('shows clear button when value is not empty', () => {
    const onChange = vi.fn();
    render(<SearchBar value="test" onChange={onChange} />);
    expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument();
  });

  it('hides clear button when value is empty', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    expect(screen.queryByLabelText(/clear search/i)).not.toBeInTheDocument();
  });

  it('clears value when clear button is clicked', async () => {
    // This test exercises a click, not the debounce. Fake timers (set in beforeEach)
    // deadlock user-event, whose async wrapper runs inside React's act queue.
    vi.useRealTimers();
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchBar value="test" onChange={onChange} />);
    
    const clearButton = screen.getByLabelText(/clear search/i);
    await user.click(clearButton);
    
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('updates local value when prop value changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchBar value="old" onChange={onChange} />);
    
    rerender(<SearchBar value="new" onChange={onChange} />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('new');
  });
});
