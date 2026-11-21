# 🐝 Beekey Medics — web app (v0.1 prototype)

Medicines, online doctor consultations (Google Meet) and lab tests, all served by a network of local partners: doctors, labs, pharmacies and delivery riders.

## Run it

```bash
npm start            # = python3 -m http.server 5173
# open http://localhost:5173
```

The app has no build step and no dependencies: plain HTML, modern CSS and ES modules.
It must be served over HTTP, because ES modules don't load from `file://`.

**Demo OTP everywhere: `1234`.**

## Database & deployment

The app has two modes, set in **`js/config.js`**:

| Mode | When | Data |
|---|---|---|
| **Demo** | `supabaseUrl` empty (default) | Stays on each phone/browser |
| **Shared database** | Supabase URL + anon key filled in | One database for every phone, browser and app, with live updates (orders, partner actions, rider GPS) |

### Connect the database (one time, about 10 minutes)
1. Create a free project at [supabase.com](https://supabase.com). Choose the **Mumbai (ap-south-1)** region and save the database password.
2. In the project, open **SQL Editor**. Paste and run **`supabase/migrations/20261121000000_init.sql`**, which creates the tables.
3. Paste and run **`supabase/seed.sql`**, which adds the sample doctors, labs, pharmacies and riders for Kochi, Pune and Perinthalmanna.
4. Copy the **Project URL** and **anon public key** from **Project Settings → API** into `js/config.js`. Never use the `service_role` key.
5. Commit and push. Vercel redeploys on its own.
6. Rebuild the phone apps so they pick up the new config: `npm run android:apk` (Android) or `npm run ios` (iOS, on a Mac).

The admin console shows **☁️ Shared database connected** once it works.

> ⚠️ **Testing security.** The tables currently let anyone with the app read and write, which is fine for client testing with sample data. Before real patients use the app, real SMS OTP login and per-user access rules must be switched on (see Road to production).

The sample data is generated from `js/data.js`. After changing partners there, run `npm run db:seed-sql`. To run the database on your own computer, run `npm run db:start`, which needs Docker.

### Hosting
- **Vercel:** `vercel.json` serves the files as they are, with no build step, and adds security and cache headers. `.vercelignore` keeps the app projects and tooling out of the deploy.
- **Your own Ubuntu server:** `deploy/nginx.conf` gives the same setup on Nginx, and Supabase can be self-hosted with Docker. Nothing in the code is tied to Vercel.

### Phone apps (Capacitor)
| Command | What it does |
|---|---|
| `npm run android:run` | Starts the emulator and installs and opens the app |
| `npm run android:apk` | Builds a test APK (`android/app/build/outputs/apk/debug/`) |
| `npm run android:bundle` | Builds the Play Store bundle (needs a signing key) |
| `npm run ios` | Opens the iOS project in Xcode (Mac only) |

## Themes

**Medical** (blue & white, default) · **Honey** (black & yellow) · **Night**. Switch with the 🎨 button in the header; the choice is remembered per browser.

## What works

| Area | Behaviour |
|---|---|
| Guest browsing | Anyone can browse medicines, doctors and lab tests without logging in |
| Login gate | Login (phone + OTP) is asked for only at **checkout**, **doctor booking** and **lab booking**. After login the user goes straight back to what they were doing |
| Medicines | Categories, search, cart, Rx items need a prescription upload, free delivery above ₹299 |
| Doctors | Speciality → doctor list → profile → date/slot → **Online (Google Meet)**. In-clinic visits are shown as "coming soon" |
| Lab tests | Category → test → **every lab's own price**, sorted cheapest first → home collection or lab visit → slot |
| Delivery location & branches | **Asked before every order.** This covers checkout, prescription upload and home lab collection. Options are **◎ Use my live location** (GPS), **search** any address in India, or moving the map under a fixed pin. The street address fills in automatically, and the customer adds house/flat and a landmark. Beekey serves **anywhere in India where a verified partner is within 15 km**, so each city is a "branch". Branches today: **Kochi** (7 pharmacies, 5 labs, 3 riders) **Pune – Kharadi** (Kharadi Wellness Pharmacy + rider Rohan S.) and **Perinthalmanna**, Kerala (Valluvanad Medicals + rider Faisal M.). Other places show "No partner pharmacy near this location yet". Admins choose the branch city when adding a partner and can switch branches on the 🗺️ Live map |
| Live order tracking | **Swiggy-style map for every order.** It shows the medical shop, the delivery location, and each stage live: waiting for the shop to accept → searching for a delivery partner (radar around the shop) → partner assigned, riding to the shop (orange route) → picked up, riding to you (blue route) → delivered. A side panel shows the shop's status, whether a partner is assigned and where they are, and the delivery location. A floating "Track →" bar follows the customer around the app while an order is active. Lab home collections are tracked the same way. Admins get a 🗺️ Live map tab, and riders get a navigation map. Movement is simulated from the order timeline (time-lapse ×10) unless the rider shares live GPS |
| Live rider GPS | On the delivery dashboard the rider taps **📡 Share live location**. Their phone's GPS (`watchPosition`) then drives the 🛵 marker on the customer's map, the rider's own map and the admin map, with accuracy, speed and "updated Xs ago". **Customer sees:** how many km and minutes away the rider is, counted via the pharmacy before pickup. **Rider sees:** turn-by-turn style "Head to pharmacy · 2.7 km · 10 min", then "Deliver to Asha · 0.7 km", plus how far the customer is. Arrival at the shop or door is detected within 120 m. If there's no fresh fix, it falls back to the simulation. Demo sync is between tabs of the same browser via localStorage; production sends fixes through the backend (see road to production #7) |
| Prescription → delivery | The doctor ends the call and types the medicines or uploads a prescription. **Hex search** picks the nearest pharmacy that has everything in stock, the pharmacy packs the order, the nearest rider is auto-assigned, and the customer tracks it live ("Your medicine will be delivered to you") |
| Partner portal | Login or apply to join as Doctor / Lab / Medical shop / Delivery partner. Each role has its own dashboard |

### Admin console
Open `#/admin` (link in the footer and on the Partner page). Demo login: **admin / beekey@2026**.
- **Pending:** approve or reject "Apply to join" requests from doctors, labs, pharmacies and riders.
- **Doctors / Labs / Medical shops / Delivery partners:** add new partners, verify, suspend or remove.
- Only **verified** partners are shown to patients and can log in to a partner dashboard.

### Customer features
- 📷 **Upload a prescription** from the home page; it goes to the nearest pharmacy.
- ↻ **Order again** on past orders, plus a "running low?" refill card on the home page.
- ✔ **Verified badges** and ⭐ **patient reviews** for doctors, labs and pharmacies.
- 👨‍👩‍👧 **Family profiles**: book doctors and lab tests for family members.
- ⏰ **Medicine reminders** (Orders → Reminders), created from prescriptions or added manually, with browser notifications.
- 📲 **Installable app (PWA)**: `manifest.webmanifest` + `sw.js`. Use "Install" in Profile or "Add to home screen".

### Try the full flow
1. Book a consult with any doctor and log in as a customer.
2. Partner login → **Doctor** → pick the same doctor → **End call & prescribe** → add medicines → send.
3. Partner login → **Medical shop** → pick the shop named in the toast → Accept → Packed.
4. Partner login → **Delivery partner** → pick the assigned rider → Picked up → Delivered.
5. Customer → Orders → Track. Open the tracking page in a second tab and it updates live as partners act.
   Alternatively, press **Simulate next step** on the tracking page.

## Structure

```
index.html          shell + bee-with-stethoscope logo (SVG symbol)
css/styles.css      design system: honey/ink tokens, light/dark, nesting, @property,
                    scroll-driven reveals, view transitions, container queries, :has()
js/data.js          demo network: doctors, medicines, tests, labs (own prices), shops (stock), riders
js/store.js         localStorage store (swap for API calls later)
js/hex.js           hexagonal grid + k-ring nearest-partner search + SVG map
js/livemap.js       live maps (Leaflet + OpenStreetMap, OSRM road routes): order/lab tracking, rider nav, admin fleet
js/app.js           router, customer pages, login gate, order engine
js/partner.js       doctor / shop / rider / lab dashboards, e-prescription
js/admin.js         admin console: verify / add / suspend / remove partners, approve applications
js/config.js        deployment settings: Supabase URL + anon key, demo tools on/off
js/db.js            cloud sync with Supabase (load, save changes, realtime updates, rider GPS)
js/native.js        bridge to the Android/iOS app shells (native GPS, status bar)
js/vendor/          supabase-js client (self-hosted copy, no CDN needed)
supabase/           database schema (migrations/) and sample partners (seed.sql)
android/, ios/      native app projects (Capacitor); resources/ holds the icon & splash sources
vercel.json, deploy/nginx.conf  hosting on Vercel or your own Ubuntu server
js/features.js      prescription upload, reorder, reviews, family profiles, medicine reminders
sw.js, manifest.webmanifest  installable app (PWA) + offline support
js/icons.js         premium SVG medicine illustrations (13 forms × 10 tints) + category icons
js/icons-care.js    speciality + lab-category illustrations and illustrated doctor portraits
assets/photos/      real photos (WebP) for specialities, lab tests and health concerns — free Unsplash License, sources in credits.json
assets/photos/products/  one realistic, unbranded photo per medicine (m1.webp … m22.webp)
assets/logo.svg     Beekey hexagon logo with medical cross + heartbeat (logo-512.png, apple-touch-icon.png)
scripts/export-icons.mjs  `npm run icons` → 54 standalone SVGs + preview sheet in assets/icons/
```

## Road to production

1. **Backend + DB.** Supabase (Postgres + auth + realtime) is cheapest to start with, or Node/NestJS + Postgres + PostGIS. Move `store.js` to API calls; realtime replaces the cross-tab `storage` event.
2. **Real admin & OTP auth.** The admin password is only a demo check in the browser; move it to the server with proper roles.
3. **Real OTP.** MSG91 or Firebase Phone Auth.
3. **Real hex index.** Use [`h3-js`](https://github.com/uber/h3-js) at resolution 8 on real lat/lng. Store each partner's H3 cell, then run `gridDisk(customerCell, k)` with k = 1, 2, 3… The logic is already the same as in `hex.js`.
4. **Google Meet links.** Google Calendar API `events.insert` with `conferenceData.createRequest`. Use the doctor's Google account (OAuth) or a Workspace service account.
5. **Payments.** Razorpay, for consult fees upfront and COD/UPI for medicines.
6. **Compliance (India).** Verify the doctor's NMC/State Medical Council registration and the pharmacy's drug licence during onboarding. Follow the Telemedicine Practice Guidelines 2020. Schedule H/H1/X drugs need a valid prescription.
7. **Live GPS & maps.** The rider app sends GPS fixes every few seconds over Supabase Realtime or a WebSocket, and the map markers follow those fixes instead of the simulation in `livemap.js`. The public OpenStreetMap tile, Nominatim geocoding and OSRM demo servers are only for demos: in production use Google Maps Platform, Mapbox, MapTiler, or self-hosted tiles and OSRM.
8. **Notifications.** WhatsApp/SMS and web push for order status.
9. **PWA.** Add a manifest and service worker so it installs like an app, and later wrap it with Capacitor for the Play Store.
