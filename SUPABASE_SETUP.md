# Supabase setup for Japan Trip 2026

This repository is a static HTML site. The shared expense ledger and checklist controls can now be bound to Supabase.

## Configure the page

Before the binding module loads, add this configuration to `index.html`:

```html
<script>
  window.SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
  window.SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
</script>
<script type="module" src="assets/supabase-bindings.js"></script>
```

Run [`supabase/schema.sql`](supabase/schema.sql) in Supabase Dashboard → SQL Editor first. Enable Email or Magic Link under Authentication → Providers.

The binding module now:

- loads shared expenses from Supabase on startup;
- saves, edits, and deletes expense records in Supabase;
- syncs task and packing checkboxes to Supabase;
- subscribes to realtime expense changes;
- prompts for a magic-link login before writes.

The browser may contain only the Supabase URL and anon public key. Never commit a service-role key.
