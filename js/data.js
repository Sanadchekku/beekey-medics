// Demo network data. In production this comes from the backend (partners onboarded via the Partner portal).
// Locations are kilometre offsets (x = east, y = south) from the city centre so the hex grid math stays simple;
// a real build would store lat/lng and index them with Uber's H3 library.

export const SPECIALTIES = [
  { id: 'general', name: 'General Physician', icon: '🩺', blurb: 'Fever, cold, infections, everyday care' },
  { id: 'pediatrics', name: 'Pediatrics', icon: '🧸', blurb: 'Care for infants, kids & teens' },
  { id: 'dermatology', name: 'Dermatology', icon: '✨', blurb: 'Skin, hair & nail concerns' },
  { id: 'gynecology', name: 'Gynecology', icon: '🌸', blurb: "Women's health & pregnancy" },
  { id: 'cardiology', name: 'Cardiology', icon: '❤️', blurb: 'Heart, BP & cholesterol' },
  { id: 'orthopedics', name: 'Orthopedics', icon: '🦴', blurb: 'Bones, joints & back pain' },
  { id: 'psychiatry', name: 'Mental Health', icon: '🧠', blurb: 'Stress, anxiety, sleep, mood' },
  { id: 'ent', name: 'ENT', icon: '👂', blurb: 'Ear, nose & throat' },
  { id: 'diabetology', name: 'Diabetes Care', icon: '🩸', blurb: 'Sugar control & diet plans' },
  { id: 'dentistry', name: 'Dental', icon: '🦷', blurb: 'Tooth pain, gums & oral care' },
];

export const DOCTORS = [
  { id: 'd1', name: 'Dr. Anjali Menon', spec: 'general', exp: 9, fee: 299, rating: 4.8, reviews: 312, langs: ['English', 'Malayalam', 'Hindi'], qual: 'MBBS, MD (Internal Medicine)', avatar: '👩‍⚕️' },
  { id: 'd2', name: 'Dr. Rahul Varma', spec: 'general', exp: 6, fee: 249, rating: 4.6, reviews: 188, langs: ['English', 'Hindi', 'Tamil'], qual: 'MBBS', avatar: '👨‍⚕️' },
  { id: 'd3', name: 'Dr. Fathima Rasheed', spec: 'pediatrics', exp: 11, fee: 399, rating: 4.9, reviews: 421, langs: ['English', 'Malayalam'], qual: 'MBBS, DCH, MD (Pediatrics)', avatar: '👩‍⚕️' },
  { id: 'd4', name: 'Dr. Arjun Nair', spec: 'pediatrics', exp: 7, fee: 349, rating: 4.7, reviews: 150, langs: ['English', 'Malayalam', 'Hindi'], qual: 'MBBS, MD (Pediatrics)', avatar: '👨‍⚕️' },
  { id: 'd5', name: 'Dr. Sneha Kulkarni', spec: 'dermatology', exp: 8, fee: 449, rating: 4.8, reviews: 276, langs: ['English', 'Hindi', 'Marathi'], qual: 'MBBS, MD (Dermatology)', avatar: '👩‍⚕️' },
  { id: 'd6', name: 'Dr. Priya Thomas', spec: 'gynecology', exp: 14, fee: 499, rating: 4.9, reviews: 508, langs: ['English', 'Malayalam'], qual: 'MBBS, MS (OBG)', avatar: '👩‍⚕️' },
  { id: 'd7', name: 'Dr. Vikram Iyer', spec: 'cardiology', exp: 16, fee: 699, rating: 4.9, reviews: 390, langs: ['English', 'Tamil', 'Hindi'], qual: 'MBBS, MD, DM (Cardiology)', avatar: '👨‍⚕️' },
  { id: 'd8', name: 'Dr. Sameer Khan', spec: 'orthopedics', exp: 10, fee: 499, rating: 4.7, reviews: 221, langs: ['English', 'Hindi', 'Urdu'], qual: 'MBBS, MS (Ortho)', avatar: '👨‍⚕️' },
  { id: 'd9', name: 'Dr. Meera Pillai', spec: 'psychiatry', exp: 12, fee: 599, rating: 4.9, reviews: 342, langs: ['English', 'Malayalam', 'Hindi'], qual: 'MBBS, MD (Psychiatry)', avatar: '👩‍⚕️' },
  { id: 'd10', name: 'Dr. Joseph Mathew', spec: 'ent', exp: 13, fee: 399, rating: 4.6, reviews: 198, langs: ['English', 'Malayalam'], qual: 'MBBS, MS (ENT)', avatar: '👨‍⚕️' },
  { id: 'd11', name: 'Dr. Kavya Reddy', spec: 'diabetology', exp: 9, fee: 449, rating: 4.8, reviews: 233, langs: ['English', 'Telugu', 'Hindi'], qual: 'MBBS, MD, Fellowship in Diabetology', avatar: '👩‍⚕️' },
  { id: 'd12', name: 'Dr. Nikhil Shah', spec: 'dentistry', exp: 7, fee: 299, rating: 4.7, reviews: 167, langs: ['English', 'Gujarati', 'Hindi'], qual: 'BDS, MDS', avatar: '👨‍⚕️' },
  { id: 'd13', name: 'Dr. Lakshmi Das', spec: 'general', exp: 18, fee: 399, rating: 4.9, reviews: 655, langs: ['English', 'Malayalam', 'Tamil'], qual: 'MBBS, MD (General Medicine)', avatar: '👩‍⚕️' },
];

export const MED_CATEGORIES = [
  { id: 'all', name: 'All', icon: '🍯' },
  { id: 'fever', name: 'Fever & Pain', icon: '🌡️' },
  { id: 'cold', name: 'Cold & Cough', icon: '🤧' },
  { id: 'diabetes', name: 'Diabetes', icon: '🩸' },
  { id: 'heart', name: 'Heart & BP', icon: '❤️' },
  { id: 'stomach', name: 'Stomach Care', icon: '🫄' },
  { id: 'vitamins', name: 'Vitamins', icon: '💊' },
  { id: 'skin', name: 'Skin Care', icon: '🧴' },
  { id: 'devices', name: 'Devices', icon: '🩹' },
];

export const MEDICINES = [
  { id: 'm1', form: 'tablet', tint: 'coral', name: 'Paracetamol 650mg', brand: 'Calpol-type generic', cat: 'fever', pack: 'Strip of 15 tablets', price: 32, mrp: 38, rx: false },
  { id: 'm2', form: 'tablet', tint: 'rose', name: 'Ibuprofen 400mg', brand: 'Generic', cat: 'fever', pack: 'Strip of 10 tablets', price: 24, mrp: 30, rx: false },
  { id: 'm3', form: 'tablet', tint: 'blue', name: 'Cetirizine 10mg', brand: 'Generic', cat: 'cold', pack: 'Strip of 10 tablets', price: 18, mrp: 22, rx: false },
  { id: 'm4', form: 'syrup', tint: 'blue', name: 'Cough Syrup (Dextromethorphan)', brand: 'Generic', cat: 'cold', pack: '100 ml bottle', price: 95, mrp: 115, rx: false },
  { id: 'm5', form: 'capsule', tint: 'teal', name: 'Steam Inhaler Capsules', brand: 'Herbal', cat: 'cold', pack: '10 capsules', price: 60, mrp: 70, rx: false },
  { id: 'm6', form: 'tablet', tint: 'white', name: 'Metformin 500mg', brand: 'Generic', cat: 'diabetes', pack: 'Strip of 20 tablets', price: 42, mrp: 50, rx: true },
  { id: 'm7', form: 'tablet', tint: 'teal', name: 'Glimepiride 1mg', brand: 'Generic', cat: 'diabetes', pack: 'Strip of 10 tablets', price: 68, mrp: 80, rx: true },
  { id: 'm8', form: 'strips', tint: 'rose', name: 'Glucometer Test Strips', brand: 'Accu-type', cat: 'devices', pack: '50 strips', price: 849, mrp: 999, rx: false },
  { id: 'm9', form: 'tablet', tint: 'red', name: 'Amlodipine 5mg', brand: 'Generic', cat: 'heart', pack: 'Strip of 15 tablets', price: 38, mrp: 45, rx: true },
  { id: 'm10', form: 'tablet', tint: 'coral', name: 'Atorvastatin 10mg', brand: 'Generic', cat: 'heart', pack: 'Strip of 15 tablets', price: 89, mrp: 105, rx: true },
  { id: 'm11', form: 'bp', tint: 'honey', name: 'Digital BP Monitor', brand: 'Generic', cat: 'devices', pack: '1 unit', price: 1599, mrp: 2199, rx: false },
  { id: 'm12', form: 'tablet', tint: 'green', name: 'Pantoprazole 40mg', brand: 'Generic', cat: 'stomach', pack: 'Strip of 15 tablets', price: 74, mrp: 88, rx: true },
  { id: 'm13', form: 'sachet', tint: 'orange', name: 'ORS Electrolyte Sachets', brand: 'WHO formula', cat: 'stomach', pack: 'Pack of 10', price: 55, mrp: 65, rx: false },
  { id: 'm14', form: 'gel', tint: 'teal', name: 'Antacid Gel (Mint)', brand: 'Generic', cat: 'stomach', pack: '170 ml bottle', price: 110, mrp: 125, rx: false },
  { id: 'm15', form: 'softgel', tint: 'honey', name: 'Vitamin D3 60K', brand: 'Generic', cat: 'vitamins', pack: '4 softgels', price: 120, mrp: 140, rx: false },
  { id: 'm16', form: 'jar', tint: 'orange', name: 'Multivitamin Daily', brand: 'Generic', cat: 'vitamins', pack: '30 tablets', price: 299, mrp: 360, rx: false },
  { id: 'm17', form: 'effervescent', tint: 'orange', name: 'Vitamin C + Zinc', brand: 'Generic', cat: 'vitamins', pack: '20 effervescent tabs', price: 149, mrp: 180, rx: false },
  { id: 'm18', form: 'lotion', tint: 'lilac', name: 'Moisturising Lotion SPF 30', brand: 'Derma', cat: 'skin', pack: '200 ml', price: 349, mrp: 420, rx: false },
  { id: 'm19', form: 'cream', tint: 'rose', name: 'Clotrimazole Cream 1%', brand: 'Generic', cat: 'skin', pack: '20 g tube', price: 65, mrp: 78, rx: false },
  { id: 'm20', form: 'capsule', tint: 'red', name: 'Amoxicillin 500mg', brand: 'Generic', cat: 'cold', pack: 'Strip of 10 capsules', price: 92, mrp: 110, rx: true },
  { id: 'm21', form: 'thermometer', tint: 'honey', name: 'Digital Thermometer', brand: 'Generic', cat: 'devices', pack: '1 unit', price: 199, mrp: 299, rx: false },
  { id: 'm22', form: 'tablet', tint: 'white', name: 'Azithromycin 500mg', brand: 'Generic', cat: 'cold', pack: 'Strip of 3 tablets', price: 78, mrp: 95, rx: true },
];

export const TEST_CATEGORIES = [
  { id: 'blood', name: 'Blood Tests', icon: '🩸', blurb: 'CBC, ESR, blood group' },
  { id: 'diabetes', name: 'Diabetes', icon: '🍬', blurb: 'HbA1c, fasting sugar' },
  { id: 'thyroid', name: 'Thyroid', icon: '🦋', blurb: 'T3, T4, TSH' },
  { id: 'fullbody', name: 'Full Body Checkups', icon: '🧬', blurb: 'Complete health packages' },
  { id: 'heart', name: 'Heart & Lipids', icon: '❤️', blurb: 'Lipid profile, ECG' },
  { id: 'vitamins', name: 'Vitamins', icon: '☀️', blurb: 'Vitamin D, B12, iron' },
  { id: 'liver', name: 'Liver & Kidney', icon: '🫘', blurb: 'LFT, KFT, urine' },
  { id: 'imaging', name: 'Scans & Imaging', icon: '🩻', blurb: 'X-ray, ultrasound' },
];

export const TESTS = [
  { id: 't1', name: 'Complete Blood Count (CBC)', cat: 'blood', params: 24, prep: 'No fasting needed', tat: '12 hrs' },
  { id: 't2', name: 'ESR', cat: 'blood', params: 1, prep: 'No fasting needed', tat: '12 hrs' },
  { id: 't3', name: 'Blood Group & Rh', cat: 'blood', params: 2, prep: 'No fasting needed', tat: '24 hrs' },
  { id: 't4', name: 'HbA1c', cat: 'diabetes', params: 3, prep: 'No fasting needed', tat: '24 hrs' },
  { id: 't5', name: 'Fasting Blood Sugar', cat: 'diabetes', params: 1, prep: '10–12 hrs fasting', tat: '8 hrs' },
  { id: 't6', name: 'Thyroid Profile (T3, T4, TSH)', cat: 'thyroid', params: 3, prep: 'No fasting needed', tat: '24 hrs' },
  { id: 't7', name: 'Basic Full Body Checkup', cat: 'fullbody', params: 62, prep: '10–12 hrs fasting', tat: '36 hrs' },
  { id: 't8', name: 'Advanced Full Body Checkup', cat: 'fullbody', params: 91, prep: '10–12 hrs fasting', tat: '48 hrs' },
  { id: 't9', name: 'Lipid Profile', cat: 'heart', params: 8, prep: '10–12 hrs fasting', tat: '24 hrs' },
  { id: 't10', name: 'ECG', cat: 'heart', params: 1, prep: 'No preparation', tat: '2 hrs' },
  { id: 't11', name: 'Vitamin D (25-OH)', cat: 'vitamins', params: 1, prep: 'No fasting needed', tat: '24 hrs' },
  { id: 't12', name: 'Vitamin B12', cat: 'vitamins', params: 1, prep: 'No fasting needed', tat: '24 hrs' },
  { id: 't13', name: 'Iron Studies', cat: 'vitamins', params: 4, prep: '8 hrs fasting', tat: '24 hrs' },
  { id: 't14', name: 'Liver Function Test (LFT)', cat: 'liver', params: 11, prep: '8 hrs fasting', tat: '24 hrs' },
  { id: 't15', name: 'Kidney Function Test (KFT)', cat: 'liver', params: 9, prep: 'No fasting needed', tat: '24 hrs' },
  { id: 't16', name: 'Urine Routine', cat: 'liver', params: 18, prep: 'Early morning sample', tat: '12 hrs' },
  { id: 't17', name: 'Chest X-Ray', cat: 'imaging', params: 1, prep: 'Visit lab', tat: '6 hrs' },
  { id: 't18', name: 'Ultrasound Abdomen', cat: 'imaging', params: 1, prep: '6 hrs fasting, full bladder', tat: '6 hrs' },
];

// Each lab sets its own price per test (partners compete on price inside the network).
export const LABS = [
  { id: 'l1', name: 'HoneyComb Diagnostics', x: 1.2, y: -0.8, rating: 4.7, nabl: true, home: true,
    prices: { t1: 299, t2: 120, t3: 150, t4: 449, t5: 99, t6: 499, t7: 1499, t8: 2799, t9: 549, t10: 299, t11: 999, t12: 799, t13: 899, t14: 549, t15: 549, t16: 149 } },
  { id: 'l2', name: 'CityCare Labs', x: -2.1, y: 1.5, rating: 4.5, nabl: true, home: true,
    prices: { t1: 249, t2: 99, t4: 399, t5: 89, t6: 449, t7: 1299, t8: 2499, t9: 499, t11: 899, t12: 699, t14: 499, t15: 499, t16: 129, t17: 399 } },
  { id: 'l3', name: 'Precision Path Lab', x: 3.4, y: 2.6, rating: 4.8, nabl: true, home: true,
    prices: { t1: 349, t3: 180, t4: 499, t5: 120, t6: 549, t7: 1699, t8: 2999, t9: 599, t10: 349, t11: 1099, t12: 849, t13: 949, t14: 599, t15: 599, t16: 169, t17: 449, t18: 1199 } },
  { id: 'l4', name: 'Sunrise Scan & Diagnostics', x: -0.6, y: -3.2, rating: 4.4, nabl: false, home: false,
    prices: { t10: 249, t17: 349, t18: 999, t1: 229, t5: 79, t9: 449 } },
  { id: 'l5', name: 'GreenLeaf Health Lab', x: 0.4, y: 3.9, rating: 4.6, nabl: true, home: true,
    prices: { t1: 279, t2: 110, t3: 140, t4: 429, t5: 95, t6: 479, t7: 1399, t9: 529, t11: 949, t12: 749, t13: 849, t15: 529, t16: 139 } },
];

// Medical shops in the network. `out` lists medicine ids currently out of stock.
export const SHOPS = [
  { id: 's1', name: 'Bee Well Pharmacy', area: 'MG Road', x: 0.9, y: 0.4, rating: 4.7, out: ['m11'] },
  { id: 's2', name: 'Lifeline Medicals', area: 'Kaloor', x: -1.7, y: -1.1, rating: 4.5, out: ['m8', 'm18'] },
  { id: 's3', name: 'Apex Chemists', area: 'Palarivattom', x: 2.8, y: -2.0, rating: 4.6, out: [] },
  { id: 's4', name: 'CarePlus Pharmacy', area: 'Edappally', x: -3.2, y: 2.4, rating: 4.4, out: ['m10'] },
  { id: 's5', name: 'Hive Health Store', area: 'Vyttila', x: 3.9, y: 3.1, rating: 4.8, out: ['m22'] },
  { id: 's6', name: 'Sri Ganesh Medicals', area: 'Kadavanthra', x: 0.2, y: 2.7, rating: 4.3, out: ['m7', 'm11', 'm16'] },
  { id: 's7', name: 'Family Medical Hall', area: 'Thrikkakara', x: -4.4, y: -2.9, rating: 4.5, out: [] },
];

export const DELIVERY = [
  { id: 'r1', name: 'Arun K.', vehicle: 'Scooter · KL-07 AB 1234', x: 0.5, y: -0.3, phone: '+91 90000 11111' },
  { id: 'r2', name: 'Salman P.', vehicle: 'Bike · KL-07 CD 5678', x: -2.0, y: 1.0, phone: '+91 90000 22222' },
  { id: 'r3', name: 'Divya R.', vehicle: 'EV Scooter · KL-07 EF 9012', x: 2.5, y: 2.2, phone: '+91 90000 33333' },
];

export const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
export const LAB_SLOTS = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '10:00', '11:00', '16:00', '17:00'];

export const byId = (list, id) => list.find((x) => x.id === id);
