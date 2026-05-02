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

export async function ensureUsersTable(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        business_name TEXT NOT NULL
      )
    `);
    await client.query(`
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS logo_data TEXT
    `);
  } finally {
    client.release();
  }
}


export async function ensureResetTokensTable(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } finally {
    client.release();
  }
}

export async function ensurePushTokensTable(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } finally {
    client.release();
  }
}

export async function upsertPushToken(userId: string, token: string): Promise<void> {
  await getPool().query(
    `INSERT INTO push_tokens (user_id, token) VALUES ($1, $2)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id`,
    [userId, token]
  );
}

export async function getPushTokensByUserId(userId: string): Promise<string[]> {
  const r = await getPool().query(
    'SELECT token FROM push_tokens WHERE user_id = $1',
    [userId]
  );
  return r.rows.map((row: { token: string }) => row.token);
}

export type AppUser = { id: string; email: string; password_hash: string; business_name: string; logo_data: string | null };

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const r = await getPool().query('SELECT * FROM app_users WHERE LOWER(email) = LOWER($1)', [email]);
  return r.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const r = await getPool().query('SELECT * FROM app_users WHERE id = $1', [id]);
  return r.rows[0] ?? null;
}

export async function createUser(id: string, email: string, passwordHash: string, businessName: string): Promise<void> {
  await getPool().query(
    'INSERT INTO app_users (id, email, password_hash, business_name) VALUES ($1, $2, $3, $4)',
    [id, email, passwordHash, businessName]
  );
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await getPool().query('UPDATE app_users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
}

export async function updateUserLogo(userId: string, logoData: string | null): Promise<void> {
  await getPool().query('UPDATE app_users SET logo_data = $1 WHERE id = $2', [logoData, userId]);
}

export async function createResetToken(token: string, userId: string, expiresAt: Date): Promise<void> {
  await getPool().query(
    'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expiresAt]
  );
}

export async function findResetToken(token: string): Promise<{ user_id: string; expires_at: Date; used: boolean } | null> {
  const r = await getPool().query('SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1', [token]);
  return r.rows[0] ?? null;
}

export async function markResetTokenUsed(token: string): Promise<void> {
  await getPool().query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);
}

export async function ensureReviewsTable(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        customer_name TEXT,
        invoice_ref TEXT,
        rating INTEGER NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } finally {
    client.release();
  }
}

export type DbReview = {
  id: string;
  user_id: string;
  customer_name: string | null;
  invoice_ref: string | null;
  rating: number;
  text: string;
  created_at: Date;
};

export async function insertReview(
  id: string,
  userId: string,
  customerName: string | null,
  invoiceRef: string | null,
  rating: number,
  text: string
): Promise<void> {
  await getPool().query(
    `INSERT INTO reviews (id, user_id, customer_name, invoice_ref, rating, text)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [id, userId, customerName || null, invoiceRef || null, rating, text]
  );
}

export async function getReviewsByUserId(userId: string): Promise<DbReview[]> {
  const r = await getPool().query(
    'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return r.rows;
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
