# Development Setup Guide - AG Water Tracker

This guide walks you through setting up your local development environment for the AG Water Tracker PWA.

## Prerequisites

Before you begin, ensure you have:

- **Node.js v20+** installed ([Download](https://nodejs.org/)) — v22 LTS recommended
  ```bash
  node --version  # Should show v20.0.0 or higher (v22 LTS recommended)
  ```
- **npm** (comes with Node.js) or **pnpm**
  ```bash
  npm --version
  ```
- **Git** for version control ([Download](https://git-scm.com/))
- **Code Editor** - VS Code recommended ([Download](https://code.visualstudio.com/))

## Step 1: Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd AG-Water-Tracker

# Install dependencies
npm install

# Or if using pnpm:
# pnpm install
```

**Expected output**: Dependencies installed successfully, no errors.

## Step 2: Obtain API Keys

You'll need accounts and API keys from three services. Follow these sub-steps carefully:

### 2.1 Supabase (Backend & Database)

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project** → Sign up (GitHub/Google/Email)
3. Click **New Project**
4. Fill in:
   - **Name**: `ag-water-tracker` (or your preference)
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is sufficient for development
5. Click **Create new project** (takes ~2 minutes to provision)
6. Once ready, go to **Project Settings** (gear icon) → **API**
7. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### 2.1.1 Enable Phone Auth (Required for OTP Login)

The app uses passwordless phone OTP authentication. You must enable the Phone provider in Supabase:

1. In your Supabase project, go to **Authentication** → **Providers**
2. Find **Phone** and click to enable it
3. Choose your SMS provider:
   - **Twilio** (recommended for production): Enter your Twilio Account SID, Auth Token, and Messaging Service SID
   - **Test mode** (for development): Enable "Enable test OTP" and add test phone numbers with static OTP codes
4. Click **Save**

**Development Tip:** Use Supabase's test OTP feature to avoid needing real SMS during development. Add a test phone number (e.g., `+15555550100`) with a static code (e.g., `123456`).

### 2.2 Mapbox (Maps & Geolocation)

1. Go to [mapbox.com/signup](https://mapbox.com/signup)
2. Sign up with email or GitHub
3. After verification, go to [account.mapbox.com](https://account.mapbox.com)
4. Navigate to **Access Tokens**
5. Click **Create a token**
6. Configure:
   - **Name**: `AG Water Tracker Development`
   - **Scopes**: Check `styles:read`, `fonts:read`, `styles:tiles`
7. Click **Create token**
8. Copy the token (starts with `pk.eyJ...`)

**Alternative (Free, No API Key):**
If you prefer not to use Mapbox, you can use Leaflet with OpenStreetMap (completely free). See [ARCHITECTURE.md](ARCHITECTURE.md) for instructions on switching map providers.

### 2.3 PowerSync (Offline Sync)

1. Go to [powersync.com](https://www.powersync.com/)
2. Click **Sign Up** → Create account
3. Click **New Instance**
4. Configure instance:
   - **Name**: `ag-water-tracker-dev`
   - **Region**: Choose closest region
5. Click **Create**
6. Navigate to **Connections** → **Add Connection**
7. Select **Supabase**
8. Fill in:
   - **Supabase Project URL**: (from Step 2.1)
   - **Supabase Service Role Key**: Go back to Supabase → Settings → API → Copy **service_role key** (secret!)
9. Click **Connect** (PowerSync will verify connection)
10. Go to **Sync Rules** tab → We'll configure this in Step 4
11. Copy your **PowerSync Endpoint** (looks like `https://xxxxx.powersync.com`)

## Step 3: Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and fill in your API keys:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PowerSync
VITE_POWERSYNC_URL=https://xxxxx.powersync.com

# Mapbox (or leave empty if using Leaflet)
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsZjhxNnN4MDAw...

# Optional: GPS verification range in meters (default: 100)
VITE_GPS_RANGE_METERS=100
```

**Security Notes:**
- **Never commit `.env` to git** (it's in `.gitignore` by default)
- The `VITE_SUPABASE_ANON_KEY` is safe to expose in client-side code (it's public)
- **Never use the `service_role` key in frontend code** (only use it for PowerSync setup)

## Step 4: Set Up Supabase Database

Now we'll create the database tables using the migration scripts.

1. Open [supabase.com](https://supabase.com) → Select your project
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open `supabase/migrations/001_initial_schema.sql` from this project
5. Copy the entire contents
6. Paste into Supabase SQL Editor
7. Click **Run** (bottom-right)
8. Verify success: You should see "Success. No rows returned"
9. Repeat for these migration files in order:
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_phone_otp_user_fields.sql`
   - `supabase/migrations/004_add_phone_column.sql`
   - `supabase/migrations/007_farm_members.sql` (user-farm relationships)
   - `supabase/migrations/008_farm_invites.sql` (invite code management)
   - `supabase/migrations/009_update_users_table.sql` (removes farm_id/role from users)
   - `supabase/migrations/010_auth_rpcs.sql` (atomic RPC functions)
   - `supabase/migrations/011_new_rls_policies.sql` (updated RLS for new tables)

**Verify Tables Created:**
1. Go to **Table Editor** (left sidebar)
2. You should see tables:
   - `farms`
   - `users`
   - `wells`
   - `allocations`
   - `readings`
   - `farm_members` (NEW - user-farm relationships)
   - `farm_invites` (NEW - invite codes)

**Alternative (Using Supabase CLI):**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

## Step 5: Configure PowerSync Sync Rules

PowerSync needs to know what data to sync to each user's device.

1. Go to your PowerSync instance → **Sync Rules** tab
2. Click **Edit Rules**
3. Copy the sync rules from `docs/API.md` (section: PowerSync Sync Rules)
4. Paste into the editor
5. Click **Deploy**
6. Verify: Status should show "Active" with no errors

## Step 6: Run Development Server

You're ready to run the app!

```bash
npm run dev
```

**Expected output:**
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h to show help, q to quit
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**You should see:** The AG Water Tracker login page (once implemented) or the default Vite React page (if starting from scratch).

## Step 7: Verification Checklist

Verify your setup is working correctly:

- [ ] Development server runs without errors
- [ ] No console errors in browser DevTools
- [ ] TypeScript compilation successful (`npm run type-check`)
- [ ] Can import Supabase client (check `src/lib/supabase.ts`)
- [ ] Can import PowerSync (check `src/lib/powersync.ts`)
- [ ] Tailwind CSS working (try adding a styled div)
- [ ] Environment variables loaded (check `import.meta.env.VITE_SUPABASE_URL`)

## Troubleshooting

### Issue: "Cannot find module '@supabase/supabase-js'"
**Solution**: Dependencies not installed. Run `npm install`.

### Issue: "Invalid project URL"
**Solution**: Check `.env` file - `VITE_SUPABASE_URL` should start with `https://` and end with `.supabase.co`.

### Issue: "Network error when connecting to PowerSync"
**Solution**:
1. Verify `VITE_POWERSYNC_URL` is correct
2. Check PowerSync instance is "Active" in dashboard
3. Verify Supabase connection in PowerSync settings

### Issue: Mapbox map not loading
**Solution**:
1. Verify `VITE_MAPBOX_TOKEN` starts with `pk.`
2. Check browser console for API errors
3. Verify token scopes include `styles:read`
4. Alternative: Switch to Leaflet (no API key needed)

### Issue: "Cannot read property of undefined" errors
**Solution**: Restart dev server after modifying `.env` file:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Issue: RLS (Row Level Security) errors
**Solution**:
1. Verify RLS policies were applied (run `002_rls_policies.sql`)
2. Check you're authenticated (RLS blocks anonymous users)
3. Temporarily disable RLS for testing:
   - Supabase → Table Editor → Select table → Disable RLS
   - **Remember to re-enable for production!**

### Issue: TypeScript errors in IDE
**Solution**:
1. Ensure VS Code is using workspace TypeScript: `Cmd/Ctrl+Shift+P` → "TypeScript: Select TypeScript Version" → "Use Workspace Version"
2. Restart TypeScript server: `Cmd/Ctrl+Shift+P` → "TypeScript: Restart TS Server"
3. Run `npm run type-check` to see all errors

### Issue: "Module not found" for internal files
**Solution**: Check `tsconfig.json` paths are configured correctly. Restart dev server.

## Next Steps

Setup complete! Now you can:

1. **Start Building**: Follow [task.md](task.md) for step-by-step implementation
2. **Understand Architecture**: Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
3. **Database Reference**: See [API.md](API.md) for schema and API docs
4. **Run Tests**: `npm test` (once tests are implemented)

## Development Workflow

**Daily workflow:**
```bash
# Pull latest changes
git pull

# Install any new dependencies
npm install

# Start dev server
npm run dev

# In another terminal: run type checking
npm run type-check -- --watch

# Make changes, test in browser
# ...

# Commit changes
git add .
git commit -m "feat: add well form component"
```

**Before pushing:**
```bash
# Run linter
npm run lint

# Run type check
npm run type-check

# Run tests (when available)
npm test

# Build to verify production works
npm run build
```

## Recommended VS Code Extensions

Install these extensions for better DX:

- **ES7+ React/Redux/React-Native snippets** - Code snippets
- **Tailwind CSS IntelliSense** - Autocomplete for Tailwind classes
- **ESLint** - Linting errors inline
- **Prettier** - Code formatting
- **Error Lens** - Inline error messages
- **GitLens** - Git blame and history
- **Thunder Client** - API testing (for Supabase REST API)

Install via VS Code: `Cmd/Ctrl+Shift+X` → Search extension name → Install

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [PowerSync Docs](https://docs.powersync.com/)
- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Questions or Issues?** Check [ARCHITECTURE.md](ARCHITECTURE.md) for technical details or open an issue in the project repository.
