export const up = (pgm) => {
  pgm.addColumn('users', {
    failed_login_attempts: { type: 'integer', notNull: true, default: 0 },
    locked_until: { type: 'timestamptz', default: null },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('users', ['failed_login_attempts', 'locked_until']);
};
