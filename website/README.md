# HomeStox website

Marketing and legal site for the HomeStox app, served at
`https://homestox.codedelights.com`.

Plain HTML and CSS — no build step, no dependencies. Open `index.html` in a
browser to preview, or serve the folder with any static server.

## Pages

| File | URL (with `cleanUrls`) | Purpose |
|---|---|---|
| `index.html` | `/` | Landing page |
| `privacy.html` | `/privacy` | Privacy policy — **required by Google Play** |
| `terms.html` | `/terms` | Terms of service |
| `data-deletion.html` | `/data-deletion` | Web account-deletion route — **required by Google Play** |
| `support.html` | `/support` | Support contact and FAQ |

`cleanUrls: true` is what makes the extension-less paths work. The app links to
the extension-less form (see `src/constants/links.ts`), so **do not turn that
setting off** — every legal link in the app would 404, including the privacy
policy URL submitted to Play Console.

## Deploying

The site is a second Firebase Hosting target alongside CatchAll's, under the
same `codedelights-site` project.

First time only — create the site and map the target:

```bash
firebase login
firebase hosting:sites:create homestox --project codedelights-site
firebase target:apply hosting homestox homestox --project codedelights-site
```

Then, from this directory:

```bash
firebase deploy --only hosting:homestox --project codedelights-site
```

### Custom domain

In the Firebase console → Hosting → the `homestox` site → **Add custom domain**,
enter `homestox.codedelights.com` and add the DNS records it gives you. Wait for
the certificate to provision before submitting anything to Play Console — a
privacy policy URL that doesn't resolve is a review finding.

Verify after deploying:

```bash
curl -I https://homestox.codedelights.com/privacy        # expect 200
curl -I https://homestox.codedelights.com/data-deletion  # expect 200
```

## Before going live

- [ ] `support@codedelights.com` is a working mailbox — it appears on every page
      and is the only contact route for deletion requests
- [ ] Play Store link on the landing page replaced (search for `TODO` in
      `index.html`) once the listing exists
- [ ] Governing-law jurisdiction in `terms.html` §13 confirmed
- [ ] Effective dates in `privacy.html` and `terms.html` still accurate

## Keeping it in sync with the app

These pages describe real behaviour, and Play compares them against your Data
safety declaration. If any of the following change, update the site to match:

- What the app collects → `privacy.html` §3
- Who data is shared with, including new processors → `privacy.html` §4
- What account deletion removes → `data-deletion.html`, and the app's
  `delete-account` Edge Function is the source of truth
- The URLs themselves → `src/constants/links.ts` in the app
