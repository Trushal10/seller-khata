/* Seller Khata settings. The key below is Supabase's public (anon/publishable) key:
   it is safe to put in a website because the database only lets each signed-in
   person reach their own rows. Never put the service_role / secret key here. */
window.SK_CONFIG = {
  supabaseUrl: 'https://rhtencwfuottfuznlwvk.supabase.co',
  supabaseKey: 'sb_publishable_na42lzynFxiUJo01nfYZ1Q_egJeyTmy'
};

/* Products added automatically the first time you sign in (only if your khata is empty). */
window.SK_STARTER = [
  { id: 'p-ice-roller-2', name: 'Ice Roller for Face (Pack of 2)', skus: ['IR-CAPSULE-P2-PURPLE'], cat: 'Beauty', cost: 0, packing: null, low: null, open: 0, price: {}, payout: {}, note: '', active: true, images: ['repo:ice-roller-pack-of-2.webp'] },
  { id: 'p-icing-kit', name: 'Face Icing Kit (2 Rollers + Ice Bowl)', skus: [], cat: 'Beauty', cost: 0, packing: null, low: null, open: 0, price: {}, payout: {}, note: '2 ice roller capsules + 1 collapsible silicone bowl', active: true, images: ['repo:face-icing-kit.jpg'] },
  { id: 'p-corn-peeler', name: 'Twist Corn Peeler', skus: [], cat: 'Kitchen', cost: 0, packing: null, low: null, open: 0, price: {}, payout: {}, note: '', active: true, images: [] },
  { id: 'p-scalp-massager', name: 'Silicone Scalp Massager', skus: [], cat: 'Personal care', cost: 0, packing: null, low: null, open: 0, price: {}, payout: {}, note: 'White shampoo brush', active: true, images: [] },
  { id: 'p-oil-dispenser', name: 'Glass Oil Dispenser (Press Top)', skus: [], cat: 'Kitchen', cost: 0, packing: null, low: null, open: 0, price: {}, payout: {}, note: 'Green/white press top', active: true, images: [] },
  { id: 'p-rotary-peeler', name: '3-in-1 Rotary Peeler', skus: [], cat: 'Kitchen', cost: 0, packing: null, low: null, open: 0, price: {}, payout: {}, note: '', active: true, images: [] }
];
