import { ApiError } from '../../core/api/client';
import { messageFor } from '../errorMessage';

/**
 * Every form caught with a bare `} catch {` and showed a fixed sentence, discarding the API's
 * own message at the one moment it was worth having: a 400 naming the field that is wrong became
 * "Failed to save", and the user's only remaining move was to try the same thing again.
 */
describe('messageFor', () => {
  it('relays what the server actually said', () => {
    expect(messageFor(new ApiError('Duration must be between 1 and 1440 minutes', 400), 'Failed to save')).toBe(
      'Duration must be between 1 and 1440 minutes',
    );
  });

  it('falls back when the failure carried no message to relay', () => {
    expect(messageFor(new TypeError('Network request failed'), 'Failed to save')).toBe('Failed to save');
    expect(messageFor(undefined, 'Failed to save')).toBe('Failed to save');
  });

  it('falls back for an ApiError with an empty message rather than showing a blank toast', () => {
    expect(messageFor(new ApiError('', 500), 'Failed to save')).toBe('Failed to save');
  });
});
