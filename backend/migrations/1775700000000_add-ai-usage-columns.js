export const up = (pgm) => {
  pgm.addColumns('users', {
    ai_calls_used: { type: 'int', default: 0 },
    ai_calls_reset_month: { type: 'text' },
  });
};

export const down = (pgm) => {
  pgm.dropColumns('users', ['ai_calls_used', 'ai_calls_reset_month']);
};
