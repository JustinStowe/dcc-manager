# Authentication update — installation and verification

This patch adds email/password signup and sign-in, email confirmation, sign-out
for the current session, session refresh, and a protected home page. It uses the
Supabase project and publishable key you configured.

## 1. Apply the patch

1. Stop Next.js with Ctrl+C.
2. Extract this ZIP into a temporary folder.
3. Copy its `src` folder into your existing `dcc-manager/src`, merging folders
   and replacing `src/app/page.tsx` and the Supabase helpers when prompted.
4. Keep this document in the project root for reference.

The canonical helper location for this project is **`src/utils/supabase`**,
because the `@/` alias points to `src`. If your starter helpers are currently at
the project root in `utils/supabase`, remove that duplicate folder after applying
this patch; the complete replacement helpers are included under `src`.

The Next.js entry point is **`src/proxy.ts`**, alongside `src/app`. If you
previously created a Next.js entry point at `middleware.ts` or
`src/middleware.ts`, remove that old entry point to avoid two conventions.
Keep **`src/utils/supabase/middleware.ts`**: it is the helper imported by Proxy,
not a Next.js entry point.

No crawler controller, browser ID adapter, browser repository, domain file,
package.json, or lockfile is included in this patch. Your existing browser ID
changes and campaign rules stay in place. No SQL migration is needed yet.

## 2. Dependencies and environment

You already installed the Supabase packages. If that step was missed, run:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Keep your existing `.env.local` at the project root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Use the publishable key. This update does not require a secret or service-role
key. Restart Next.js after any environment-file changes. Keep `.env.local` out
of git; the existing project ignore rules already cover it.

## 3. Supabase dashboard settings

### Email/password provider

In the project's Authentication settings, make sure email/password sign-in and
new user signup are enabled. Keep email confirmation enabled for the flow below.

The signup form requires at least 8 characters. Supabase remains responsible for
enforcing the project's complete password policy; if it is stricter, use a
password that satisfies it.

### Site URL

Under **Authentication → URL Configuration**, set the development **Site URL**
to:

```text
http://localhost:3000
```

This must match the address you use in the browser. Open confirmation links on
the computer running the development server. Before deployment, change the Site
URL to the deployed application origin and review the redirect configuration.

### Confirm signup email template

Open **Authentication → Email Templates → Confirm signup**. Set the message body
to the following, or retain your wording and use this exact link:

```html
<h2>Confirm your Dungeon Crawler Carl Manager account</h2>
<p>Follow this link to confirm your email address:</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email">
    Confirm email address
  </a>
</p>
```

Save the template **before** creating the test account. This custom link sends
the token hash to the application's server route, where Supabase verifies it
and establishes session cookies. The default template's link is not the flow
implemented by this patch. Only `type=email` is accepted by this route.

### If a signup email does not arrive

Check the project's Authentication logs. Supabase's default email service
restricts recipients to authorized project team addresses and has low sending
limits. Test with your project team email, or configure custom SMTP for other
player addresses. See the official SMTP guide linked below. If an account was
already created with an old email template, a confirmed account can still sign
in using email and password; request a new confirmation through the dashboard
if needed. This patch does not add resend-confirmation or password-reset UI.

## 4. Run the automated checks

From your existing project folder:

```bash
npm run check
```

This patch adds **20 authentication service tests**. Starting with your confirmed
100 tests across 7 files, expect **120 tests across 8 files**, followed by lint,
typecheck, and production build.

The home, login, signup, and confirmation routes are now dynamic because they
depend on request cookies. The build will therefore no longer report the home
page as static. A Proxy entry in the route output is also expected.

## 5. Manual browser verification

Run `npm run dev`, then use `http://localhost:3000` throughout:

1. In a signed-out browser session, open `/`. Expect a redirect to `/login`.
2. Open **Create an account**, enter your email and a qualifying password,
   and submit. Expect a check-your-email notice.
3. Open the confirmation email on this computer and follow the link.
   Expect the tracker with your signed-in email and a Sign out button.
4. Refresh. Expect to remain signed in.
5. Load your previous crawler. Confirm its saved data is preserved.
6. Sign out. Expect `/login`. Open `/` again; it must redirect to `/login`.
7. Try an incorrect password. Expect a form error and no tracker access.
8. Sign in with the correct password. Expect the tracker.
9. In a private browser window, open `/`. Expect sign-in to be required
   independently of the first window.
10. Open `/auth/confirm` without a token. Expect a confirmation error on the
    login page, not authenticated access.
11. Leave the session open long enough to exercise refresh, then navigate again.
    Confirm it remains signed in while the session is valid.

Opening the page via the browser Back button may show an old visual snapshot.
Refreshing or making a new protected-page request must require sign-in after
sign-out.

## Behavior and boundaries

- The supplied starter middleware only constructed a client. The replacement
  calls `getClaims()` to refresh and verify the token and returns the response
  carrying the refreshed cookies.
- The protected page separately calls `getUser()` for a server-confirmed user.
  No server authorization relies on a cookie's unverified embedded user.
- Request cookies and response cookies are both updated during refresh.
- Responses passing through Proxy use `private, no-store`. Authenticated pages
  are dynamic and must not be placed behind a cache that ignores these headers.
- Redirect destinations are fixed local paths. The confirmation route ignores
  arbitrary `next` or `redirect_to` query values.
- Passwords are not trimmed. Provider exceptions are not displayed verbatim.
- Account creation does not assign a GM role or campaign membership.
- Sign-out ends the current session; it does not sign out other devices.
- The crawler tracker is still a **local browser preview**. Its saves are not
  separated by signed-in account. Anyone signing in using the same browser
  profile and origin can load that browser's preview save. The UI states this.
  Per-account crawler storage and campaign permissions at the database boundary
  are the next milestone.

## Code organization

| Path | Responsibility |
| --- | --- |
| `src/proxy.ts` | Next.js 16 session-refresh entry point |
| `src/utils/supabase` | Configuration and browser/server/Proxy clients |
| `src/adapters/supabase-authentication.ts` | Supabase adapter and verified-user checks |
| `src/services/authentication.ts` | Credential validation and authentication outcomes |
| `src/app/auth/actions.ts` | Server actions for account operations |
| `src/app/auth/confirm/route.ts` | Signup email verification |
| `src/controllers/use-auth-controller.ts` | Form action state and pending state |
| `src/models/auth-presentation.ts` | View model and action contracts |
| `src/components/auth-form.tsx` | Auth controller/view composition |
| `src/components/crawler-workspace.tsx` | Existing crawler controller/view composition |
| `src/views` and `src/styles/auth.module.css` | Auth presentation and CSS |

## Validation performed here

- Executed all **118 test cases available in the workspace** using the existing
  minimal assertion runner; all passed, with 787 syntax/import/assertion checks.
  Your two additional browser ID tests are not present in this workspace and
  are not replaced by the patch. They account for the expected local total of 120.
- Ran 27 additional assertions against the actual auth adapter, actions,
  confirmation route, server cookie writer, and Proxy helper with mocked
  Next.js and Supabase dependencies. Covered denied access, successful access,
  sign-out failures, confirmation rejection, fixed redirects, session refresh,
  cookie propagation, and cache headers.
- A dependency installation attempt returned npm HTTP 403. Real Vitest,
  TypeScript, ESLint, Next.js build, browser rendering, and a live Supabase
  account flow could not be run here. Complete the local checks above before
  treating this milestone as verified.

## Official references

- [Supabase server-side clients and session refresh](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Next.js Proxy convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Supabase email template variables and server-side verification](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase SMTP configuration and default email limits](https://supabase.com/docs/guides/auth/auth-smtp)
