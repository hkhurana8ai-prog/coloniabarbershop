// server/seed.js
// Run with: npm run seed
// Safe to re-run — it clears and re-inserts services/barbers/hours, but never
// touches existing bookings or leads.

const db = require("./db");

const services = [
  { name: "Haircut", slug: "haircut", description: "Classic clipper or scissor cut, finished and styled.", duration_minutes: 30, price_cents: 2500, is_featured: 1, sort_order: 1 },
  { name: "Fade Cut", slug: "fade-cut", description: "Skin, low, mid, or high fade blended to your guard length.", duration_minutes: 40, price_cents: 3000, is_featured: 1, sort_order: 2 },
  { name: "Buzz Cut", slug: "buzz-cut", description: "All-over clipper cut, one consistent guard length.", duration_minutes: 20, price_cents: 2000, is_featured: 0, sort_order: 3 },
  { name: "Custom Cut", slug: "custom-cut", description: "Tell your barber exactly what you want — designs, parts, length combos.", duration_minutes: 40, price_cents: 3000, is_featured: 0, sort_order: 4 },
  { name: "Hair Shape Up", slug: "shape-up", description: "Quick clean-up on the edges, neckline, and hairline.", duration_minutes: 15, price_cents: 1500, is_featured: 1, sort_order: 5 },
  { name: "Razor Cut", slug: "razor-cut", description: "Detail work finished with a straight razor for a crisp edge.", duration_minutes: 35, price_cents: 3000, is_featured: 0, sort_order: 6 },
  { name: "Scissor Cut", slug: "scissor-cut", description: "Hand-scissored cut for longer styles and soft texture.", duration_minutes: 40, price_cents: 3000, is_featured: 0, sort_order: 7 },
  { name: "Head Shave", slug: "head-shave", description: "Full head shave, hot towel finish.", duration_minutes: 30, price_cents: 2800, is_featured: 0, sort_order: 8 },
  { name: "Military Haircut", slug: "military-haircut", description: "Regulation-style cut, short and sharp.", duration_minutes: 25, price_cents: 2200, is_featured: 0, sort_order: 9 },
  { name: "Kids' Cut", slug: "kids-cut", description: "Patient, friendly cuts for younger clients.", duration_minutes: 25, price_cents: 2000, is_featured: 1, sort_order: 10 },
  { name: "Beard Trim", slug: "beard-trim", description: "Shape and tighten the beard line.", duration_minutes: 15, price_cents: 1500, is_featured: 1, sort_order: 11 },
  { name: "Beard Maintenance", slug: "beard-maintenance", description: "Trim, line-up, and conditioning for a beard already in shape.", duration_minutes: 20, price_cents: 1800, is_featured: 0, sort_order: 12 },
  { name: "Shave", slug: "shave", description: "Classic wet shave.", duration_minutes: 25, price_cents: 2200, is_featured: 0, sort_order: 13 },
  { name: "Hot Towel Shave", slug: "hot-towel-shave", description: "Steamed towel, lather, and a straight-razor shave.", duration_minutes: 35, price_cents: 3000, is_featured: 1, sort_order: 14 },
  { name: "Straight Razor Shave", slug: "straight-razor-shave", description: "Full straight-razor shave with pre-shave oil and balm finish.", duration_minutes: 35, price_cents: 3200, is_featured: 0, sort_order: 15 },
  { name: "Eyebrow Trimming", slug: "eyebrow-trimming", description: "Quick clean-up, scissor or trimmer.", duration_minutes: 10, price_cents: 1000, is_featured: 0, sort_order: 16 },
];

const barbers = [
  { name: "Jose", title: "Barber", bio: "Known for clean fades and taking the time to get the line right.", sort_order: 1 },
  { name: "Imad", title: "Barber", bio: "Go-to for sharp shape-ups and straight-razor finishes.", sort_order: 2 },
];

// Mon–Fri 8:30a–8:00p, Sat 8:30a–6:00p, Sun 8:30a–2:00p
// (0 = Sunday ... 6 = Saturday). Edit to match your actual posted hours.
const hours = [
  { day_of_week: 0, open_time: "08:30", close_time: "14:00" },
  { day_of_week: 1, open_time: "08:30", close_time: "20:00" },
  { day_of_week: 2, open_time: "08:30", close_time: "20:00" },
  { day_of_week: 3, open_time: "08:30", close_time: "20:00" },
  { day_of_week: 4, open_time: "08:30", close_time: "20:00" },
  { day_of_week: 5, open_time: "08:30", close_time: "20:00" },
  { day_of_week: 6, open_time: "08:30", close_time: "18:00" },
];

const run = db.transaction(() => {
  db.prepare("DELETE FROM services").run();
  db.prepare("DELETE FROM barbers").run();
  db.prepare("DELETE FROM business_hours").run();

  const insService = db.prepare(`
    INSERT INTO services (name, slug, description, duration_minutes, price_cents, is_featured, sort_order)
    VALUES (@name, @slug, @description, @duration_minutes, @price_cents, @is_featured, @sort_order)
  `);
  for (const s of services) insService.run(s);

  const insBarber = db.prepare(`
    INSERT INTO barbers (name, title, bio, sort_order) VALUES (@name, @title, @bio, @sort_order)
  `);
  for (const b of barbers) insBarber.run(b);

  const insHours = db.prepare(`
    INSERT INTO business_hours (day_of_week, open_time, close_time) VALUES (@day_of_week, @open_time, @close_time)
  `);
  for (const h of hours) insHours.run(h);
});

run();

console.log(`Seeded ${services.length} services, ${barbers.length} barbers, and weekly hours.`);
console.log("Prices and durations above are placeholders — edit server/seed.js with your real prices, then run `npm run seed` again.");
