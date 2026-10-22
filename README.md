# Seller Khata

Stock, orders, payouts, expenses and real profit for a Meesho and Flipkart business.
Works on phone and computer, and can be installed to the home screen.

- **Dashboard**: net profit for any period, payout received and pending, returns/RTO rate, daily earnings, platform split, best sellers, low stock.
- **Products**: photos, SKU, cost, packing, stock, selling price and payout per platform, with profit per unit.
- **Import report**: upload Meesho or Flipkart orders and payment files as downloaded. Re-importing the same file never double-counts.
- **Orders, Expenses, Reports**: month-wise profit & loss, product-wise sales, CSV downloads, full backup and restore.

## How it runs

- The website is plain files (no build step), hosted free on GitHub Pages.
- Your data lives in your own free [Supabase](https://supabase.com) project. Each signed-in person can only see their own rows.

## One-time setup

1. **Supabase project**: create a free project (region: South Asia / Mumbai).
2. **Database**: open *SQL Editor*, paste everything from [`schema.sql`](schema.sql) and click *Run*.
3. **Keys**: in *Project Settings → API Keys*, copy the *Project URL* and the public *anon* (or *publishable*) key into [`config.js`](config.js). Never use the `service_role` / secret key here.
4. **Sign-in links**: in *Authentication → URL Configuration*, set *Site URL* to the GitHub Pages address of this site, so confirmation and password-reset emails open the app.
5. **Hosting**: repository *Settings → Pages → Deploy from a branch → main → / (root)*.

Then open the site, choose **Create your account**, and sign in with the same email on every device.

## Moving data from the Claude version

In the Claude version open *Setup → Download backup*. In this version open *Setup → Restore from backup* and pick that file. Photos uploaded in the Claude version need to be added again.
