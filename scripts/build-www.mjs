// Copies the web app into www/, the folder Capacitor packs into the iOS and Android apps.
// The website has no build step. For the apps, the CSS is also compiled for older phone
// WebViews (iOS 15+, Android WebView/Chrome 90+), because nested CSS is not supported before
// iOS 17.2 / Chrome 120 and the page would otherwise lose most of its layout.
import fs from 'node:fs';
import { transform } from 'lightningcss';

const OUT = 'www';
const FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'assets'];
const SKIP = ['assets/icons']; // exported SVG sheet, not used at runtime
const v = (major) => major << 16;
const TARGETS = { chrome: v(90), android: v(90), safari: v(15), ios_saf: v(15) };

fs.rmSync(OUT, { recursive: true, force: true });
for (const f of FILES) fs.cpSync(f, `${OUT}/${f}`, { recursive: true, filter: (src) => !SKIP.some((s) => src === s || src.startsWith(s + '/')) });

// App-only CSS (the website is left exactly as it is): the header extends under the iPhone notch / Android status bar.
const APP_CSS = '\n.topbar { padding-top: env(safe-area-inset-top, 0px); }\n';

for (const file of fs.readdirSync('css').filter((f) => f.endsWith('.css'))) {
  const src = fs.readFileSync(`css/${file}`, 'utf8') + (file === 'styles.css' ? APP_CSS : '');
  const { code, warnings } = transform({ filename: file, code: Buffer.from(src), targets: TARGETS, minify: true, errorRecovery: true });
  fs.writeFileSync(`${OUT}/css/${file}`, code);
  for (const w of warnings) console.warn(`  css warning: ${w.message} (${file}:${w.loc?.line})`);
}
console.log(`www/ ready (${FILES.join(', ')}; CSS compiled for older phones)`);
