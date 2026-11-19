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

## What works

| Area | Behaviour |
|---|---|
| Guest browsing | Anyone can browse medicines, doctors and lab tests without logging in |
| Login gate | Login (phone + OTP) is asked for only at **checkout**, **doctor booking** and **lab booking**. After login the user goes straight back to what they were doing |
| Medicines | Categories, search, cart, Rx items need a prescription upload, free delivery above ₹299 |
| Doctors | Speciality → doctor list → profile → date/slot → **Online (Google Meet)**. In-clinic visits are shown as "coming soon" |
| Lab tests | Category → test → **every lab's own price**, sorted cheapest first → home collection or lab visit → slot |
| Prescription → delivery | The doctor ends the call and types the medicines or uploads a prescription. **Hex search** picks the nearest pharmacy that has everything in stock, the pharmacy packs the order, the nearest rider is auto-assigned, and the customer tracks it live ("Your medicine will be delivered to you") |
| Partner portal | Login or apply to join as Doctor / Lab / Medical shop / Delivery partner. Each role has its own dashboard |

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
js/app.js           router, customer pages, login gate, order engine
js/partner.js       doctor / shop / rider / lab dashboards, e-prescription
js/icons.js         premium SVG medicine illustrations (13 forms × 10 tints) + category icons
js/icons-care.js    speciality + lab-category illustrations and illustrated doctor portraits
scripts/export-icons.mjs  `npm run icons` → 54 standalone SVGs + preview sheet in assets/icons/
```

## Road to production

1. **Backend + DB.** Supabase (Postgres + auth + realtime) is cheapest to start with, or Node/NestJS + Postgres + PostGIS. Move `store.js` to API calls; realtime replaces the cross-tab `storage` event.
2. **Real OTP.** MSG91 or Firebase Phone Auth.
3. **Real hex index.** Use [`h3-js`](https://github.com/uber/h3-js) at resolution 8 on real lat/lng. Store each partner's H3 cell, then run `gridDisk(customerCell, k)` with k = 1, 2, 3… The logic is already the same as in `hex.js`.
4. **Google Meet links.** Google Calendar API `events.insert` with `conferenceData.createRequest`. Use the doctor's Google account (OAuth) or a Workspace service account.
5. **Payments.** Razorpay, for consult fees upfront and COD/UPI for medicines.
6. **Compliance (India).** Verify the doctor's NMC/State Medical Council registration and the pharmacy's drug licence during onboarding. Follow the Telemedicine Practice Guidelines 2020. Schedule H/H1/X drugs need a valid prescription.
7. **Notifications.** WhatsApp/SMS and web push for order status.
8. **PWA.** Add a manifest and service worker so it installs like an app, and later wrap it with Capacitor for the Play Store.
