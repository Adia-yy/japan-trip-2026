# Supabase setup for Japan Trip 2026

This repository is a static HTML site, so the Supabase **project** must be created in the Supabase Dashboard. The database schema and browser adapter are included here.

## 1. Create the project

1. Create a project at <https://supabase.com/dashboard>.
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Authentication → Providers**, enable Email. Magic-link sign-in is sufficient.
4. Copy the project URL and the **anon public** key. Do not use or commit the service-role key.

## 2. Configure the page

Before loading `assets/supabase.js`, add this configuration to `index.html`:

```html
<script>
  window.SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
  window.SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
</script>
<script type="module" src="assets/supabase.js"></script>
```

The adapter exports functions for authentication, the shared expense ledger, checklist persistence, and realtime expense updates. The existing page can continue using local storage until its form handlers are switched to these functions.

## Security

Row-level security is enabled and every table policy requires an authenticated user. The anon key is safe for browser use, but a service-role key is never safe to expose in `index.html`.
