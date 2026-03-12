/**
 * Creates meal plan tables for reusable meal plan templates.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS meal_plan_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_meal_plan_templates_user
    ON meal_plan_templates(user_id);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS meal_plan_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL REFERENCES meal_plan_templates(id) ON DELETE CASCADE,
      meal_type text NOT NULL,
      name text NOT NULL,
      calories numeric DEFAULT 0,
      protein numeric DEFAULT 0,
      carbs numeric DEFAULT 0,
      fats numeric DEFAULT 0,
      portion_amount numeric,
      portion_unit text,
      start_time text,
      sort_order int DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_meal_plan_items_template
    ON meal_plan_items(template_id);
  `);
};

export const down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS meal_plan_items');
  pgm.sql('DROP TABLE IF EXISTS meal_plan_templates');
};
