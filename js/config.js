// Beekey Medics — deployment settings. This is the only file to change per environment.
//
// Database: paste your Supabase project's URL and anon (public) key from
//   Supabase dashboard → Project Settings → API.
// Leave them empty and the app runs in demo mode (data stays on each phone/browser).
// The anon key is designed to be public; never put the service_role key here.
//
// Moving to your own Ubuntu server later? Point supabaseUrl at your self-hosted Supabase.

export const CONFIG = {
  supabaseUrl: 'https://bzjfontqkwgkulceqsnu.supabase.co',
  supabaseAnonKey: 'sb_publishable_Mbnj12r2GqeQzgzs4vvcvQ_ZJNIzZdV',

  // Client-testing helpers: "▶ Simulate next step", "Reset demo data", demo OTP 1234 hints.
  // Set to false for the public launch (after real SMS OTP is connected).
  demoTools: true,
};
