# Legal documents — hosting checklist

These are the legal documents required to publish Daily History on the App Store and Google Play.

| Document | File | Status |
|----------|------|--------|
| Privacy Policy | *(on Notion)* | ✅ Published & wired |
| Terms of Use | [terms-of-use.md](terms-of-use.md) | ✅ Published & wired |
| Account & Data Deletion Policy | [account-deletion.md](account-deletion.md) | ✅ Published & wired |

All three URLs are live on Notion and set in [config/urls.ts](../config/urls.ts).

## How to publish on Notion

1. Create a new Notion page for each document.
2. Paste the Markdown content — Notion imports headings, lists, and tables automatically.
3. Click **Share → Publish → Publish to web** and copy the public URL.
4. Optionally set a clean URL slug (e.g. `.../Terms-of-Use-...`).

## Before you fill the spelling

Both documents currently say **"Ștefan-Răzvan Dogaru"** as the provider. Confirm/correct the exact spelling of your legal name in both files (and on the Privacy Policy) so all three match.

## After publishing — update the app

The published URLs are set in [config/urls.ts](../config/urls.ts):

- `PRIVACY_POLICY_URL` — ✅ set
- `TERMS_URL` — ✅ set
- `ACCOUNT_DELETION_URL` — ✅ set

## Where each URL goes in the stores

**App Store Connect**
- Privacy Policy URL → App Privacy / App Information
- Terms of Use (EULA) → App Information → "License Agreement" (or link in the app description). The in-app links are already added (Profile + Register screen).

**Google Play Console**
- Privacy Policy URL → Store listing → Privacy Policy
- Account deletion URL → App content → **Data deletion** → "Account deletion URL" (use the Account & Data Deletion page)
- Data safety form → declare data collected + that deletion is available in-app and via the URL above
