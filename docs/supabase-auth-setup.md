# Supabase Auth Setup

## Providers

1) Go to Authentication > Providers in Supabase.
2) Enable Google and Microsoft providers.
3) Set redirect URLs:
   - Local: http://localhost:5173/auth/callback
   - Production: https://your-domain.com/auth/callback

## Site URL and Redirects

1) Go to Authentication > URL Configuration.
2) Set Site URL to your production domain.
3) Add additional redirect URLs for local and staging.

## Frontend callback handling

- The React route `/auth/callback` calls `supabase.auth.exchangeCodeForSession()`.
- After the exchange, the app redirects to `/dashboard`.

## Environment

Client expects:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Server expects:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- FRONTEND_ORIGIN

## Notes

- Microsoft OAuth uses provider name `azure` in Supabase.
- Make sure you added the same callback URL to Google and Microsoft console apps.
