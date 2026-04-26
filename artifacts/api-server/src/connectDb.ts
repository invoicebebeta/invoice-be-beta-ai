import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required');
    pool = new Pool({ connectionString, max: 5 });
  }
  return pool;
}

export async function ensureConnectedAccountsTable(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS connected_accounts (
        user_id TEXT PRIMARY KEY,
        stripe_account_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } finally {
    client.release();
  }
}

export async function getConnectedAccount(userId: string): Promise<string | null> {
  const result = await getPool().query(
    'SELECT stripe_account_id FROM connected_accounts WHERE user_id = $1',
    [userId]
  );
  return result.rows[0]?.stripe_account_id ?? null;
}

export async function upsertConnectedAccount(userId: string, stripeAccountId: string): Promise<void> {
  await getPool().query(
    `INSERT INTO connected_accounts (user_id, stripe_account_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET stripe_account_id = EXCLUDED.stripe_account_id`,
    [userId, stripeAccountId]
  );
}

export async function deleteConnectedAccount(userId: string): Promise<void> {
  await getPool().query('DELETE FROM connected_accounts WHERE user_id = $1', [userId]);
}
