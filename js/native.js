// Bridges to the iOS / Android app shells (Capacitor). In a normal browser everything falls back
// to the standard web APIs, so the same code runs on the website and inside the apps.
const Cap = typeof window !== 'undefined' ? window.Capacitor : null;
export const isNative = !!Cap?.isNativePlatform?.();
export const platform = isNative ? Cap.getPlatform() : 'web'; // 'ios' | 'android' | 'web'
const plugin = (name) => (isNative ? Cap.Plugins?.[name] || null : null);

// Native plugin errors → the same shape as web GeolocationPositionError (code 1 = permission denied).
const geoErr = (e) => ({ code: /denied|permission|not authori[sz]ed/i.test(e?.message || '') ? 1 : 2, message: e?.message || String(e) });

/** GPS: uses the native location service in the apps (one permission prompt, works on iOS and Android). */
export const geo = {
  available: () => (isNative ? !!plugin('Geolocation') : !!navigator.geolocation),
  getCurrentPosition(ok, fail, opts) {
    const G = plugin('Geolocation');
    if (!G) return navigator.geolocation.getCurrentPosition(ok, fail, opts);
    G.getCurrentPosition(opts).then(ok, (e) => fail(geoErr(e)));
  },
  watchPosition(ok, fail, opts) {
    const G = plugin('Geolocation');
    if (!G) return { web: navigator.geolocation.watchPosition(ok, fail, opts) };
    return { native: G.watchPosition(opts, (pos, err) => (err ? fail(geoErr(err)) : pos && ok(pos))) };
  },
  clearWatch(h) {
    if (!h) return;
    if (h.native) h.native.then((id) => plugin('Geolocation')?.clearWatch({ id })).catch(() => {});
    else navigator.geolocation.clearWatch(h.web);
  },
};

/** Status bar matches the app header: same background colour, dark or light icons to suit the theme. */
export function setStatusBar() {
  if (!isNative) return;
  requestAnimationFrame(() => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
    const [r, g, b] = (bg.match(/^#([0-9a-f]{6})$/i)?.[1].match(/../g) || ['ff', 'ff', 'ff']).map((h) => parseInt(h, 16));
    const dark = 0.299 * r + 0.587 * g + 0.114 * b < 140;
    if (platform === 'android') (plugin('ThemeBar') || Cap.registerPlugin?.('ThemeBar'))?.set({ color: `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`, dark }).catch(() => {});
    else plugin('StatusBar')?.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {}); // iOS: the header shows through under the bar
  });
}
