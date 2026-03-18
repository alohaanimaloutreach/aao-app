-- AAO Test Environment — Expanded Seed Data
-- Run this AFTER test_seed_data.sql in the TEST Supabase SQL Editor
-- Adds ~25 more owners, ~50 more animals, more events/care/notes to feel realistic

DO $$
DECLARE
  admin_id uuid;
  -- Location IDs
  loc_waianae uuid;
  loc_makaha uuid;
  loc_nanakuli uuid;
  loc_maili uuid;
  loc_lualualei uuid;
  loc_waipahu uuid;
  loc_kapolei uuid;
  loc_ewa uuid;
  loc_kalaeloa uuid;
  loc_makua uuid;
  loc_pokai uuid;
  loc_paiolu uuid;
  -- New owner IDs
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid;
  o6 uuid; o7 uuid; o8 uuid; o9 uuid; o10 uuid;
  o11 uuid; o12 uuid; o13 uuid; o14 uuid; o15 uuid;
  o16 uuid; o17 uuid; o18 uuid; o19 uuid; o20 uuid;
  o21 uuid; o22 uuid; o23 uuid; o24 uuid; o25 uuid;
  -- Animal IDs (for care events / notes / flags)
  a uuid;
  -- Event IDs
  ev3 uuid; ev4 uuid; ev5 uuid; ev6 uuid; ev7 uuid; ev8 uuid;
BEGIN

SELECT id INTO admin_id FROM auth.users WHERE email = 'shauna@alohaanimaloutreach.org' LIMIT 1;

-- ============================================================
-- MORE LOCATIONS
-- ============================================================

INSERT INTO locations (id, name, address, latitude, longitude, status) VALUES
  (gen_random_uuid(), 'ʻEwa Beach Park', 'ʻEwa Beach, HI', 21.3130, -158.0030, 'active'),
  (gen_random_uuid(), 'Kalaeloa Community', 'Kalaeloa, HI', 21.3170, -158.0700, 'active'),
  (gen_random_uuid(), 'Mākua Valley Road', 'Waiʻanae, HI', 21.5220, -158.2320, 'active'),
  (gen_random_uuid(), 'Pōkaʻī Bay Beach Park', 'Waiʻanae, HI', 21.4420, -158.1870, 'active'),
  (gen_random_uuid(), 'Paiolu Kaiulu', 'Waiʻanae, HI', 21.4350, -158.1780, 'active');

SELECT id INTO loc_waianae FROM locations WHERE name = 'Waianae Boat Harbor' LIMIT 1;
SELECT id INTO loc_makaha FROM locations WHERE name = 'Makaha Beach Park' LIMIT 1;
SELECT id INTO loc_nanakuli FROM locations WHERE name = 'Nanakuli Beach Park' LIMIT 1;
SELECT id INTO loc_maili FROM locations WHERE name = 'Māʻili Beach Park' LIMIT 1;
SELECT id INTO loc_lualualei FROM locations WHERE name = 'Lualualei Homesteads' LIMIT 1;
SELECT id INTO loc_waipahu FROM locations WHERE name = 'Waipahu Community Park' LIMIT 1;
SELECT id INTO loc_kapolei FROM locations WHERE name = 'Kapolei Regional Park' LIMIT 1;
SELECT id INTO loc_ewa FROM locations WHERE name = 'ʻEwa Beach Park' LIMIT 1;
SELECT id INTO loc_kalaeloa FROM locations WHERE name = 'Kalaeloa Community' LIMIT 1;
SELECT id INTO loc_makua FROM locations WHERE name = 'Mākua Valley Road' LIMIT 1;
SELECT id INTO loc_pokai FROM locations WHERE name = 'Pōkaʻī Bay Beach Park' LIMIT 1;
SELECT id INTO loc_paiolu FROM locations WHERE name = 'Paiolu Kaiulu' LIMIT 1;

-- ============================================================
-- 25 MORE OWNERS
-- ============================================================

INSERT INTO owners (id, name, phone_primary, address, primary_location_id, notes, created_by) VALUES
  (gen_random_uuid(), 'Lani Akana', '808-555-8001', '85-200 Farrington Hwy', loc_waianae, 'Feeds community cats and dogs near the harbor', admin_id),
  (gen_random_uuid(), 'Ikaika Souza', '808-555-8002', '85-420 Farrington Hwy', loc_waianae, 'Has 4 dogs, works night shifts', admin_id),
  (gen_random_uuid(), 'Noelani Kim', '808-555-8003', '84-680 Kili Dr', loc_makaha, 'Rescues injured animals, brings to vet on her own', admin_id),
  (gen_random_uuid(), 'Kawika Ching', '808-555-8004', '84-120 Ala Naauao Pl', loc_makaha, 'Retired firefighter, walks his dogs on the beach daily', admin_id),
  (gen_random_uuid(), 'Haunani Lopes', '808-555-8005', '89-210 Nanakuli Ave', loc_nanakuli, 'Has a rescue cat colony behind her house', admin_id),
  (gen_random_uuid(), 'Braddah Joe Silva', '808-555-8006', '89-560 Lualualei Hmstd Rd', loc_lualualei, 'Unhoused, keeps 2 dogs with him always', admin_id),
  (gen_random_uuid(), 'Moana Kealoha', '808-555-8007', '87-340 Māʻili Cove', loc_maili, 'Young family, 3 kids and 3 dogs', admin_id),
  (gen_random_uuid(), 'Derek Tanaka', '808-555-8008', '87-100 Māʻili Pt', loc_maili, 'Recently took in a stray litter', admin_id),
  (gen_random_uuid(), 'Auntie Pua Rodrigues', '808-555-8009', '85-640 Lualualei Hmstd Rd', loc_lualualei, 'Elder, feeds 6 neighborhood dogs', admin_id),
  (gen_random_uuid(), 'Kalei Pacheco', '808-555-8010', '94-150 Waipahu St', loc_waipahu, 'Foster home, rotates 2-3 dogs at a time', admin_id),
  (gen_random_uuid(), 'Danny Yamamoto', '808-555-8011', '91-200 Kapolei Pkwy', loc_kapolei, 'Pit bull advocate, experienced handler', admin_id),
  (gen_random_uuid(), 'Tiare Apo', '808-555-8012', '91-870 Fort Weaver Rd', loc_ewa, 'Recently adopted from shelter, needs supplies', admin_id),
  (gen_random_uuid(), 'Big Mike Kalama', '808-555-8013', 'Kalaeloa area', loc_kalaeloa, 'Lives on base, feeds strays near the fence line', admin_id),
  (gen_random_uuid(), 'Puanani Chang', '808-555-8014', '85-555 Farrington Hwy', loc_waianae, 'Runs a small taro farm, dogs roam the property', admin_id),
  (gen_random_uuid(), 'Uncle Manu Kaiwi', '808-555-8015', '84-990 Makaha Valley Rd', loc_makaha, 'Lives up the valley, hard to reach by phone', admin_id),
  (gen_random_uuid(), 'Rina Santos', '808-555-8016', '89-030 Nanakuli Ave', loc_nanakuli, 'Healthcare worker, inconsistent schedule', admin_id),
  (gen_random_uuid(), 'Hiapo Naone', '808-555-8017', '87-700 Māʻili Cove', loc_maili, 'Surfer, dogs wait on the beach for him', admin_id),
  (gen_random_uuid(), 'Lehua Kamakawiwoʻole', '808-555-8018', 'Mākua Valley area', loc_makua, 'Remote location, only see her at events', admin_id),
  (gen_random_uuid(), 'Tommy Cravalho', '808-555-8019', '85-300 Waiʻanae Valley Rd', loc_pokai, 'Mechanic, dogs hang out at the shop', admin_id),
  (gen_random_uuid(), 'Kanoe Nihipali', '808-555-8020', 'Paiolu Kaiulu', loc_paiolu, 'Community leader at the village', admin_id),
  (gen_random_uuid(), 'Makayla Reyes', '808-555-8021', '91-500 Kapolei Pkwy', loc_kapolei, 'Teenager, takes care of family dogs while parents work', admin_id),
  (gen_random_uuid(), 'Lopaka Fernandez', '808-555-8022', '94-200 Waipahu Depot Rd', loc_waipahu, 'Recently lost one dog to parvo, needs vaccine support', admin_id),
  (gen_random_uuid(), 'Destiny Mahoe', '808-555-8023', '91-800 Fort Weaver Rd', loc_ewa, 'Single mom with 2 puppies, very engaged', admin_id),
  (gen_random_uuid(), 'Bruddah Kale Ahina', '808-555-8024', '85-100 Farrington Hwy', loc_waianae, 'Fisherman, dogs are always at the harbor', admin_id),
  (gen_random_uuid(), 'Lahela Tuitele', '808-555-8025', '89-700 Lualualei Hmstd Rd', loc_lualualei, 'Multi-generational household, 5 dogs total', admin_id);

SELECT id INTO o1 FROM owners WHERE name = 'Lani Akana' LIMIT 1;
SELECT id INTO o2 FROM owners WHERE name = 'Ikaika Souza' LIMIT 1;
SELECT id INTO o3 FROM owners WHERE name = 'Noelani Kim' LIMIT 1;
SELECT id INTO o4 FROM owners WHERE name = 'Kawika Ching' LIMIT 1;
SELECT id INTO o5 FROM owners WHERE name = 'Haunani Lopes' LIMIT 1;
SELECT id INTO o6 FROM owners WHERE name = 'Braddah Joe Silva' LIMIT 1;
SELECT id INTO o7 FROM owners WHERE name = 'Moana Kealoha' LIMIT 1;
SELECT id INTO o8 FROM owners WHERE name = 'Derek Tanaka' LIMIT 1;
SELECT id INTO o9 FROM owners WHERE name = 'Auntie Pua Rodrigues' LIMIT 1;
SELECT id INTO o10 FROM owners WHERE name = 'Kalei Pacheco' LIMIT 1;
SELECT id INTO o11 FROM owners WHERE name = 'Danny Yamamoto' LIMIT 1;
SELECT id INTO o12 FROM owners WHERE name = 'Tiare Apo' LIMIT 1;
SELECT id INTO o13 FROM owners WHERE name = 'Big Mike Kalama' LIMIT 1;
SELECT id INTO o14 FROM owners WHERE name = 'Puanani Chang' LIMIT 1;
SELECT id INTO o15 FROM owners WHERE name = 'Uncle Manu Kaiwi' LIMIT 1;
SELECT id INTO o16 FROM owners WHERE name = 'Rina Santos' LIMIT 1;
SELECT id INTO o17 FROM owners WHERE name = 'Hiapo Naone' LIMIT 1;
SELECT id INTO o18 FROM owners WHERE name = 'Lehua Kamakawiwoʻole' LIMIT 1;
SELECT id INTO o19 FROM owners WHERE name = 'Tommy Cravalho' LIMIT 1;
SELECT id INTO o20 FROM owners WHERE name = 'Kanoe Nihipali' LIMIT 1;
SELECT id INTO o21 FROM owners WHERE name = 'Makayla Reyes' LIMIT 1;
SELECT id INTO o22 FROM owners WHERE name = 'Lopaka Fernandez' LIMIT 1;
SELECT id INTO o23 FROM owners WHERE name = 'Destiny Mahoe' LIMIT 1;
SELECT id INTO o24 FROM owners WHERE name = 'Bruddah Kale Ahina' LIMIT 1;
SELECT id INTO o25 FROM owners WHERE name = 'Lahela Tuitele' LIMIT 1;

-- ============================================================
-- 50 MORE ANIMALS
-- ============================================================

INSERT INTO animals (name, breed, color, sex, age_estimate, size_category, fixed_status, owner_id, primary_location_id, general_notes, created_by) VALUES
  -- Lani Akana's dogs (Waianae)
  ('Luna', 'Pit Bull Mix', 'White/Brown', 'female', 3, 'large', 'fixed', o1, loc_waianae, 'Sweet girl, good with other dogs', admin_id),
  ('Shadow', 'Mixed Breed', 'Black', 'male', 5, 'medium', 'not_fixed', o1, loc_waianae, 'Shy at first but warms up', admin_id),
  -- Ikaika's dogs (Waianae)
  ('Tank', 'Pit Bull', 'Blue', 'male', 4, 'xlarge', 'fixed', o2, loc_waianae, 'Big teddy bear despite his name', admin_id),
  ('Sista', 'Pit Bull Mix', 'Brindle', 'female', 3, 'large', 'fixed', o2, loc_waianae, 'Tank''s sister from same litter', admin_id),
  ('Tiny', 'Chihuahua', 'Tan', 'male', 6, 'small', 'not_fixed', o2, loc_waianae, 'Rules the house despite his size', admin_id),
  ('Patches', 'Mixed Breed', 'Tri-color', 'female', 2, 'medium', 'not_fixed', o2, loc_waianae, 'Found as a stray, Ikaika took her in', admin_id),
  -- Noelani's dogs (Makaha)
  ('Coco', 'Chocolate Lab', 'Brown', 'female', 7, 'large', 'fixed', o3, loc_makaha, 'Noelani''s first rescue, very loyal', admin_id),
  ('Bandit', 'Husky Mix', 'Grey/White', 'male', 2, 'large', 'not_fixed', o3, loc_makaha, 'Escape artist, needs secure yard', admin_id),
  ('Rosie', 'Terrier Mix', 'Red/White', 'female', 4, 'small', 'fixed', o3, loc_makaha, 'Found with a broken leg, fully healed now', admin_id),
  -- Kawika's dogs (Makaha)
  ('Chief', 'German Shepherd', 'Black/Tan', 'male', 8, 'xlarge', 'fixed', o4, loc_makaha, 'Senior, retired police dog. Very well trained.', admin_id),
  ('Misty', 'Lab Mix', 'Yellow', 'female', 5, 'large', 'fixed', o4, loc_makaha, 'Beach dog, loves swimming', admin_id),
  -- Haunani's dogs + cats (Nanakuli)
  ('Pepper', 'Mixed Breed', 'Black/White', 'female', 3, 'medium', 'fixed', o5, loc_nanakuli, 'Guards the cat colony', admin_id),
  ('Ginger', 'Mixed Breed', 'Red', 'female', 4, 'medium', 'not_fixed', o5, loc_nanakuli, 'Haunani''s indoor dog', admin_id),
  -- Braddah Joe's dogs (Lualualei)
  ('Soldier', 'Pit Bull Mix', 'Grey', 'male', 6, 'large', 'not_fixed', o6, loc_lualualei, 'Very bonded to Joe, protective', admin_id),
  ('Princess', 'Mixed Breed', 'Tan', 'female', 3, 'medium', 'not_fixed', o6, loc_lualualei, 'Gentle, follows Joe everywhere', admin_id),
  -- Moana's dogs (Maili)
  ('Bear', 'Lab/Pit Mix', 'Black', 'male', 5, 'xlarge', 'fixed', o7, loc_maili, 'Great with the kids, gentle giant', admin_id),
  ('Coconut', 'Pomeranian Mix', 'Cream', 'female', 2, 'small', 'not_fixed', o7, loc_maili, 'Tiny ball of energy, kids'' favorite', admin_id),
  ('Rex', 'German Shepherd Mix', 'Sable', 'male', 3, 'large', 'not_fixed', o7, loc_maili, 'Moana''s guard dog, barks at strangers', admin_id),
  -- Derek's dogs — stray litter (Maili)
  ('Pebbles', 'Mixed Breed', 'Brown/White', 'female', 0, 'small', 'not_fixed', o8, loc_maili, 'Puppy from stray litter, ~4 months old', admin_id),
  ('Bam Bam', 'Mixed Breed', 'Brown', 'male', 0, 'small', 'not_fixed', o8, loc_maili, 'Puppy from stray litter, ~4 months old', admin_id),
  ('Dino', 'Mixed Breed', 'Tan/White', 'male', 0, 'small', 'not_fixed', o8, loc_maili, 'Puppy from stray litter, ~4 months old', admin_id),
  -- Auntie Pua's neighborhood dogs (Lualualei)
  ('Queenie', 'Mixed Breed', 'Golden', 'female', 9, 'medium', 'fixed', o9, loc_lualualei, 'Senior community dog, everyone knows her', admin_id),
  ('Scooter', 'Terrier Mix', 'White', 'male', 4, 'small', 'not_fixed', o9, loc_lualualei, 'Fast little guy, hard to catch for vet visits', admin_id),
  ('Mama Dog', 'Mixed Breed', 'Brindle', 'female', 7, 'large', 'fixed', o9, loc_lualualei, 'Had multiple litters before we got her fixed', admin_id),
  ('Rusty', 'Mixed Breed', 'Red', 'male', 3, 'medium', 'not_fixed', o9, loc_lualualei, 'Mama Dog''s last puppy that stayed', admin_id),
  ('Tippy', 'Mixed Breed', 'Black/Tan', 'female', 5, 'medium', 'fixed', o9, loc_lualualei, 'Walks with a slight limp from old injury', admin_id),
  ('Ghost', 'Mixed Breed', 'White', 'male', 2, 'large', 'not_fixed', o9, loc_lualualei, 'Semi-feral, only comes to Auntie Pua', admin_id),
  -- Kalei's fosters (Waipahu)
  ('Sunny', 'Golden Mix', 'Gold', 'female', 1, 'medium', 'fixed', o10, loc_waipahu, 'Current foster — sweet, ready for adoption', admin_id),
  ('Zeus', 'Pit Bull', 'White', 'male', 2, 'large', 'fixed', o10, loc_waipahu, 'Current foster — needs experienced home', admin_id),
  -- Danny's dogs (Kapolei)
  ('Atlas', 'American Bully', 'Blue', 'male', 3, 'xlarge', 'fixed', o11, loc_kapolei, 'Show quality, very well socialized', admin_id),
  ('Athena', 'American Bully', 'Lilac', 'female', 2, 'large', 'fixed', o11, loc_kapolei, 'Atlas''s companion, equally sweet', admin_id),
  -- Tiare's dogs (Ewa)
  ('Lucky', 'Mixed Breed', 'Brown/White', 'male', 1, 'medium', 'not_fixed', o12, loc_ewa, 'Recently adopted from shelter, adjusting well', admin_id),
  -- Big Mike's strays (Kalaeloa)
  ('Rambo', 'Mixed Breed', 'Brindle', 'male', 5, 'large', 'not_fixed', o13, loc_kalaeloa, 'Stray near the base, Mike feeds daily', admin_id),
  ('Stitch', 'Mixed Breed', 'Brown', 'female', 3, 'medium', 'not_fixed', o13, loc_kalaeloa, 'Semi-feral, Mike is building trust', admin_id),
  -- Puanani's farm dogs (Waianae)
  ('Taro', 'Mixed Breed', 'Brown', 'male', 6, 'large', 'fixed', o14, loc_waianae, 'Farm dog, keeps chickens in line', admin_id),
  ('Poi', 'Mixed Breed', 'Tan', 'female', 4, 'medium', 'fixed', o14, loc_waianae, 'Taro''s companion, calmer temperament', admin_id),
  -- Uncle Manu's dog (Makaha)
  ('Warrior', 'Mixed Breed', 'Black', 'male', 10, 'large', 'fixed', o15, loc_makaha, 'Very old, Manu''s best friend. Arthritis.', admin_id),
  -- Rina's dogs (Nanakuli)
  ('Bella', 'Pit Bull Mix', 'Fawn', 'female', 2, 'large', 'not_fixed', o16, loc_nanakuli, 'Rina wants to get her spayed', admin_id),
  ('Oreo', 'Mixed Breed', 'Black/White', 'male', 3, 'medium', 'not_fixed', o16, loc_nanakuli, 'Friendly with everyone, bit overweight', admin_id),
  -- Hiapo's dog (Maili)
  ('Reef', 'Lab Mix', 'Yellow', 'male', 4, 'large', 'fixed', o17, loc_maili, 'Beach dog, surfs with Hiapo (seriously)', admin_id),
  -- Lehua's dogs (Makua)
  ('Kūpuna', 'Mixed Breed', 'Grey', 'female', 12, 'medium', 'fixed', o18, loc_makua, 'Very old, mostly sleeps. Lehua carries her to car.', admin_id),
  ('Keiki', 'Mixed Breed', 'Tan/White', 'male', 1, 'medium', 'not_fixed', o18, loc_makua, 'Young and wild, hard to examine', admin_id),
  -- Tommy's shop dogs (Pokai Bay)
  ('Wrench', 'Pit Bull Mix', 'Red', 'male', 5, 'large', 'fixed', o19, loc_pokai, 'Greets every customer at the shop', admin_id),
  ('Diesel', 'Rottweiler Mix', 'Black/Tan', 'male', 4, 'xlarge', 'fixed', o19, loc_pokai, 'Looks scary, actually a baby', admin_id),
  -- Kanoe's dogs (Paiolu)
  ('Aloha', 'Mixed Breed', 'Golden', 'female', 3, 'medium', 'fixed', o20, loc_paiolu, 'Village mascot, everyone loves her', admin_id),
  ('Makani', 'Mixed Breed', 'White/Brown', 'male', 2, 'medium', 'not_fixed', o20, loc_paiolu, 'Fast runner, name means wind', admin_id),
  -- Makayla's dogs (Kapolei)
  ('Simba', 'Chow Mix', 'Red', 'male', 3, 'large', 'not_fixed', o21, loc_kapolei, 'Fluffy, looks like a lion. Teen takes great care.', admin_id),
  -- Lopaka's dog (Waipahu)
  ('Hope', 'Mixed Breed', 'White', 'female', 1, 'medium', 'not_fixed', o22, loc_waipahu, 'Got her after losing his other dog. Needs all vaccines.', admin_id),
  -- Destiny's puppies (Ewa)
  ('Mocha', 'Mixed Breed', 'Brown', 'female', 0, 'small', 'not_fixed', o23, loc_ewa, 'Puppy, ~5 months. Destiny''s first dog.', admin_id),
  ('Latte', 'Mixed Breed', 'Cream', 'male', 0, 'small', 'not_fixed', o23, loc_ewa, 'Mocha''s littermate. Very playful.', admin_id);

-- Set interested_in_fixing for some unfixed dogs
UPDATE animals SET interested_in_fixing = 'interested' WHERE name IN ('Shadow', 'Patches', 'Ginger', 'Coconut', 'Rex', 'Bella', 'Makani', 'Hope') AND interested_in_fixing IS NULL;
UPDATE animals SET interested_in_fixing = 'not_interested' WHERE name IN ('Tiny', 'Soldier') AND interested_in_fixing IS NULL;
UPDATE animals SET interested_in_fixing = 'maybe' WHERE name IN ('Bandit', 'Ghost', 'Stitch', 'Simba') AND interested_in_fixing IS NULL;
UPDATE animals SET urgent_medical = true WHERE name IN ('Warrior', 'Kūpuna') AND urgent_medical = false;

-- ============================================================
-- SITUATIONS for new animals
-- ============================================================

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'supported_in_place', true, now() - (random() * interval '365 days'), NULL, admin_id
FROM animals WHERE name IN (
  'Luna','Shadow','Tank','Sista','Tiny','Patches','Coco','Bandit','Rosie','Chief','Misty',
  'Pepper','Ginger','Soldier','Princess','Bear','Coconut','Rex','Taro','Poi','Warrior',
  'Bella','Oreo','Reef','Wrench','Diesel','Aloha','Makani','Simba','Atlas','Athena',
  'Lucky','Rambo','Stitch','Queenie','Scooter','Mama Dog','Rusty','Tippy'
);

-- Fosters
INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'in_foster', true, now() - interval '2 weeks', 'Foster with Kalei Pacheco — FAF placement', admin_id
FROM animals WHERE name = 'Sunny';

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'in_foster', true, now() - interval '3 weeks', 'Foster with Kalei Pacheco — K9 Kokua', admin_id
FROM animals WHERE name = 'Zeus';

-- Medical hold
INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'medical_hold', true, now() - interval '1 week', 'Severe arthritis, vet monitoring', admin_id
FROM animals WHERE name = 'Warrior';

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'medical_hold', true, now() - interval '5 days', 'Age-related decline, comfort care', admin_id
FROM animals WHERE name = 'Kūpuna';

-- Puppies
INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'supported_in_place', true, now() - interval '2 months', 'Puppy from stray litter', admin_id
FROM animals WHERE name IN ('Pebbles','Bam Bam','Dino','Mocha','Latte');

-- In transition
INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'in_transition', true, now() - interval '3 weeks', 'Building trust, semi-feral', admin_id
FROM animals WHERE name = 'Ghost';

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'in_transition', true, now() - interval '2 weeks', 'Semi-feral near base', admin_id
FROM animals WHERE name = 'Stitch';

-- Remote / lost contact
INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'lost_contact', true, now() - interval '2 months', 'Haven''t seen Lehua in a while, remote area', admin_id
FROM animals WHERE name = 'Keiki';

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT id, 'supported_in_place', true, now() - interval '6 months', NULL, admin_id
FROM animals WHERE name = 'Hope';

-- ============================================================
-- 6 MORE OUTREACH EVENTS (spanning 6 months)
-- ============================================================

INSERT INTO outreach_events (id, event_type, event_date, location_id, notes, status, total_food_lbs, total_bags, created_by) VALUES
  (gen_random_uuid(), 'monthly_outreach', (CURRENT_DATE - interval '14 days')::date, loc_maili, 'Big crowd, ran low on food bags', 'completed', 96, 22, admin_id),
  (gen_random_uuid(), 'monthly_outreach', (CURRENT_DATE - interval '45 days')::date, loc_makaha, 'Kawika helped set up, smooth event', 'completed', 78, 18, admin_id),
  (gen_random_uuid(), 'monthly_outreach', (CURRENT_DATE - interval '75 days')::date, loc_lualualei, 'First time at Lualualei, good response', 'completed', 60, 14, admin_id),
  (gen_random_uuid(), 'monthly_outreach', (CURRENT_DATE - interval '90 days')::date, loc_waianae, 'Standard monthly, all regulars showed', 'completed', 84, 20, admin_id),
  (gen_random_uuid(), 'spay_neuter_clinic', (CURRENT_DATE - interval '120 days')::date, loc_kapolei, 'Partnership with Hawaiian Humane — 8 animals fixed', 'completed', 0, 0, admin_id),
  (gen_random_uuid(), 'monthly_outreach', (CURRENT_DATE - interval '150 days')::date, loc_nanakuli, 'Holiday event, extra treats and toys donated', 'completed', 108, 24, admin_id);

SELECT id INTO ev3 FROM outreach_events WHERE notes = 'Big crowd, ran low on food bags' LIMIT 1;
SELECT id INTO ev4 FROM outreach_events WHERE notes = 'Kawika helped set up, smooth event' LIMIT 1;
SELECT id INTO ev5 FROM outreach_events WHERE notes = 'First time at Lualualei, good response' LIMIT 1;
SELECT id INTO ev6 FROM outreach_events WHERE notes = 'Standard monthly, all regulars showed' LIMIT 1;
SELECT id INTO ev7 FROM outreach_events WHERE notes = 'Partnership with Hawaiian Humane — 8 animals fixed' LIMIT 1;
SELECT id INTO ev8 FROM outreach_events WHERE notes = 'Holiday event, extra treats and toys donated' LIMIT 1;

-- ============================================================
-- CARE EVENTS for new outreach events
-- ============================================================

-- Event 3 (14 days ago, Maili) — Moana, Derek, Hiapo, Keanu
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev3, a.id, o7, loc_maili, now() - interval '14 days', ARRAY['food','vaccines'], 1, 6, admin_id FROM animals a WHERE a.name = 'Bear';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev3, a.id, o7, loc_maili, now() - interval '14 days', ARRAY['food'], 1, 3, admin_id FROM animals a WHERE a.name = 'Coconut';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev3, a.id, o7, loc_maili, now() - interval '14 days', ARRAY['food','preventatives'], 1, 6, admin_id FROM animals a WHERE a.name = 'Rex';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev3, a.id, o8, loc_maili, now() - interval '14 days', ARRAY['food','vaccines'], 1, 3, admin_id FROM animals a WHERE a.name = 'Pebbles';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev3, a.id, o8, loc_maili, now() - interval '14 days', ARRAY['food','vaccines'], 1, 3, admin_id FROM animals a WHERE a.name = 'Bam Bam';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev3, a.id, o8, loc_maili, now() - interval '14 days', ARRAY['food','vaccines'], 1, 3, admin_id FROM animals a WHERE a.name = 'Dino';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev3, a.id, o17, loc_maili, now() - interval '14 days', ARRAY['food'], 1, 6, admin_id FROM animals a WHERE a.name = 'Reef';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, health_notes, created_by)
SELECT ev3, a.id, (SELECT id FROM owners WHERE name = 'Keanu Park'), loc_maili, now() - interval '14 days', ARRAY['food','medical'], 1, 6, 'Duke still limping, gave Rimadyl refill', admin_id FROM animals a WHERE a.name = 'Duke';

-- Event 4 (45 days ago, Makaha) — Noelani, Kawika, Leilani, Uncle Manu
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev4, a.id, o3, loc_makaha, now() - interval '45 days', ARRAY['food','preventatives'], 1, 6, admin_id FROM animals a WHERE a.name = 'Coco';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev4, a.id, o3, loc_makaha, now() - interval '45 days', ARRAY['food','vaccines'], 1, 6, admin_id FROM animals a WHERE a.name = 'Bandit';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev4, a.id, o3, loc_makaha, now() - interval '45 days', ARRAY['food'], 1, 3, admin_id FROM animals a WHERE a.name = 'Rosie';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev4, a.id, o4, loc_makaha, now() - interval '45 days', ARRAY['food'], 1, 6, admin_id FROM animals a WHERE a.name = 'Chief';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev4, a.id, o4, loc_makaha, now() - interval '45 days', ARRAY['food','preventatives'], 1, 6, admin_id FROM animals a WHERE a.name = 'Misty';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, health_notes, created_by)
SELECT ev4, a.id, o15, loc_makaha, now() - interval '45 days', ARRAY['food','medical'], 1, 6, 'Warrior limping badly, referred to vet. Possible hip dysplasia.', admin_id FROM animals a WHERE a.name = 'Warrior';

-- Event 5 (75 days ago, Lualualei) — Braddah Joe, Auntie Pua, Nalani
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev5, a.id, o6, loc_lualualei, now() - interval '75 days', ARRAY['food','vaccines'], 1, 6, admin_id FROM animals a WHERE a.name = 'Soldier';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev5, a.id, o6, loc_lualualei, now() - interval '75 days', ARRAY['food','vaccines'], 1, 3, admin_id FROM animals a WHERE a.name = 'Princess';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev5, a.id, o9, loc_lualualei, now() - interval '75 days', ARRAY['food'], 2, 12, admin_id FROM animals a WHERE a.name = 'Queenie';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev5, a.id, o9, loc_lualualei, now() - interval '75 days', ARRAY['food','preventatives'], 1, 3, admin_id FROM animals a WHERE a.name = 'Scooter';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev5, a.id, o9, loc_lualualei, now() - interval '75 days', ARRAY['food'], 1, 6, admin_id FROM animals a WHERE a.name = 'Mama Dog';

-- Event 6 (90 days ago, Waianae) — Lani, Ikaika, Puanani, Kale
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev6, a.id, o1, loc_waianae, now() - interval '90 days', ARRAY['food','vaccines'], 1, 6, admin_id FROM animals a WHERE a.name = 'Luna';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev6, a.id, o1, loc_waianae, now() - interval '90 days', ARRAY['food'], 1, 3, admin_id FROM animals a WHERE a.name = 'Shadow';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev6, a.id, o2, loc_waianae, now() - interval '90 days', ARRAY['food','preventatives'], 2, 12, admin_id FROM animals a WHERE a.name = 'Tank';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev6, a.id, o2, loc_waianae, now() - interval '90 days', ARRAY['food'], 1, 6, admin_id FROM animals a WHERE a.name = 'Sista';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev6, a.id, o14, loc_waianae, now() - interval '90 days', ARRAY['food'], 1, 6, admin_id FROM animals a WHERE a.name = 'Taro';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev6, a.id, o14, loc_waianae, now() - interval '90 days', ARRAY['food'], 1, 3, admin_id FROM animals a WHERE a.name = 'Poi';

-- Event 8 (150 days ago, holiday event at Nanakuli) — lots of dogs
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev8, a.id, o5, loc_nanakuli, now() - interval '150 days', ARRAY['food','vaccines','preventatives'], 1, 3, admin_id FROM animals a WHERE a.name = 'Pepper';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev8, a.id, o5, loc_nanakuli, now() - interval '150 days', ARRAY['food'], 1, 3, admin_id FROM animals a WHERE a.name = 'Ginger';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev8, a.id, o16, loc_nanakuli, now() - interval '150 days', ARRAY['food','vaccines'], 1, 6, admin_id FROM animals a WHERE a.name = 'Bella';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev8, a.id, o16, loc_nanakuli, now() - interval '150 days', ARRAY['food'], 1, 3, admin_id FROM animals a WHERE a.name = 'Oreo';

-- ============================================================
-- MORE FIELD NOTES
-- ============================================================

INSERT INTO field_notes (animal_id, owner_id, location_id, note, flagged, flag_reason, created_by, created_at) VALUES
  ((SELECT id FROM animals WHERE name='Ghost'), o9, loc_lualualei, 'Ghost showed up again today. Let Auntie Pua pet him for the first time! Huge progress.', false, NULL, admin_id, now() - interval '4 days'),
  ((SELECT id FROM animals WHERE name='Soldier'), o6, loc_lualualei, 'Joe says Soldier has been scratching a lot. Possible flea issue. Will bring preventatives next visit.', false, NULL, admin_id, now() - interval '6 days'),
  ((SELECT id FROM animals WHERE name='Pebbles'), o8, loc_maili, 'All 3 puppies are growing fast. Derek needs help with puppy food — going through bags quickly.', false, NULL, admin_id, now() - interval '8 days'),
  ((SELECT id FROM animals WHERE name='Warrior'), o15, loc_makaha, 'Warrior can barely walk now. Uncle Manu is very worried. Vet says it could be hip dysplasia. Need to discuss pain management options.', true, 'Needs urgent vet follow-up', admin_id, now() - interval '3 days'),
  (NULL, o18, loc_makua, 'Tried to visit Lehua but road was flooded. Will try again next week.', true, 'Owner hard to reach', admin_id, now() - interval '12 days'),
  ((SELECT id FROM animals WHERE name='Bandit'), o3, loc_makaha, 'Bandit escaped again. Noelani found him 2 blocks away. Need to discuss better containment options.', false, NULL, admin_id, now() - interval '9 days'),
  ((SELECT id FROM animals WHERE name='Tank'), o2, loc_waianae, 'Tank is doing great — Ikaika keeps up with his heartworm meds. Model pet owner.', false, NULL, admin_id, now() - interval '15 days'),
  ((SELECT id FROM animals WHERE name='Coconut'), o7, loc_maili, 'Coconut is in heat. Moana wants to get her spayed ASAP. Added to priority list.', true, 'Urgent spay needed', admin_id, now() - interval '2 days'),
  (NULL, NULL, loc_kalaeloa, 'Saw 3 new strays near the old barracks. All medium, brown/tan. No collars. Will bring food and traps next time.', true, 'New strays spotted', admin_id, now() - interval '7 days'),
  ((SELECT id FROM animals WHERE name='Hope'), o22, loc_waipahu, 'Lopaka is doing much better emotionally. Hope is helping him heal. She needs her first round of vaccines.', false, NULL, admin_id, now() - interval '11 days'),
  ((SELECT id FROM animals WHERE name='Simba'), o21, loc_kapolei, 'Makayla is an amazing young caretaker. Simba is well-groomed and happy. Discussed neutering — family is considering.', false, NULL, admin_id, now() - interval '18 days'),
  ((SELECT id FROM animals WHERE name='Reef'), o17, loc_maili, 'Reef ate something off the beach and was vomiting. Seems better now. Hiapo will monitor.', true, 'Monitor for recurring vomiting', admin_id, now() - interval '5 days');

-- ============================================================
-- MORE FLAGS
-- ============================================================

INSERT INTO flags (table_name, record_id, reason, resolved, created_by, created_at) VALUES
  ('animals', (SELECT id FROM animals WHERE name='Warrior'), 'Warrior — hip dysplasia, needs pain management plan', false, admin_id, now() - interval '3 days'),
  ('animals', (SELECT id FROM animals WHERE name='Coconut'), 'Coconut — in heat, urgent spay needed before unwanted litter', false, admin_id, now() - interval '2 days'),
  ('animals', (SELECT id FROM animals WHERE name='Soldier'), 'Soldier — possible flea infestation, bring preventatives', false, admin_id, now() - interval '6 days'),
  ('animals', (SELECT id FROM animals WHERE name='Reef'), 'Reef — ate something on beach, monitor for recurring GI issues', false, admin_id, now() - interval '5 days'),
  ('owners', o18, 'Lehua — hard to reach, remote location, road access issues', false, admin_id, now() - interval '12 days'),
  ('animals', (SELECT id FROM animals WHERE name='Ghost'), 'Ghost — semi-feral progress, continue socialization tracking', false, admin_id, now() - interval '1 month');

-- ============================================================
-- Some resolved flags for history
-- ============================================================

INSERT INTO flags (table_name, record_id, reason, resolved, resolved_by, resolved_at, resolution_note, created_by, created_at) VALUES
  ('animals', (SELECT id FROM animals WHERE name='Chief'), 'Chief — overdue for vaccines', true, admin_id, now() - interval '40 days', 'Vaccinated at Makaha outreach event', admin_id, now() - interval '50 days'),
  ('animals', (SELECT id FROM animals WHERE name='Luna'), 'Luna — seemed underweight at last visit', true, admin_id, now() - interval '85 days', 'Weight checked, back to normal after food increase', admin_id, now() - interval '95 days'),
  ('animals', (SELECT id FROM animals WHERE name='Mama Dog'), 'Mama Dog — possible pregnancy', true, admin_id, now() - interval '200 days', 'Confirmed not pregnant, spay completed', admin_id, now() - interval '210 days');

-- ============================================================
-- PHOTOS for some new animals (Unsplash dog photos)
-- ============================================================

INSERT INTO photos (animal_id, storage_path, is_profile, caption, taken_at, taken_by) VALUES
  ((SELECT id FROM animals WHERE name='Tank'), 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600', true, 'Tank looking handsome', now() - interval '2 months', admin_id),
  ((SELECT id FROM animals WHERE name='Coco'), 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=600', true, 'Coco at the beach', now() - interval '6 weeks', admin_id),
  ((SELECT id FROM animals WHERE name='Chief'), 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=600', true, 'Chief on duty', now() - interval '2 months', admin_id),
  ((SELECT id FROM animals WHERE name='Bear'), 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600', true, 'Bear with the kids', now() - interval '3 weeks', admin_id),
  ((SELECT id FROM animals WHERE name='Atlas'), 'https://images.unsplash.com/photo-1477884213360-7e9d7dcc8f9b?w=600', true, 'Atlas posing', now() - interval '1 month', admin_id),
  ((SELECT id FROM animals WHERE name='Wrench'), 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=600', true, 'Wrench at the shop', now() - interval '5 weeks', admin_id),
  ((SELECT id FROM animals WHERE name='Aloha'), 'https://images.unsplash.com/photo-1587559045816-8b0a54d1db74?w=600', true, 'Aloha greeting visitors', now() - interval '2 weeks', admin_id),
  ((SELECT id FROM animals WHERE name='Reef'), 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600', true, 'Reef after surfing', now() - interval '3 weeks', admin_id),
  ((SELECT id FROM animals WHERE name='Sunny'), 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=600', true, 'Sunny ready for adoption', now() - interval '10 days', admin_id),
  ((SELECT id FROM animals WHERE name='Luna'), 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600', true, 'Luna being sweet', now() - interval '2 months', admin_id),
  ((SELECT id FROM animals WHERE name='Diesel'), 'https://images.unsplash.com/photo-1567752881298-894bb81f9379?w=600', true, 'Diesel looking tough', now() - interval '6 weeks', admin_id),
  ((SELECT id FROM animals WHERE name='Simba'), 'https://images.unsplash.com/photo-1516371535707-512a1e83bb9a?w=600', true, 'Simba the lion dog', now() - interval '3 weeks', admin_id),
  ((SELECT id FROM animals WHERE name='Rosie'), 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600', true, 'Rosie recovered', now() - interval '1 month', admin_id),
  ((SELECT id FROM animals WHERE name='Bella'), 'https://images.unsplash.com/photo-1494947665470-20322015e3a8?w=600', true, 'Bella at the park', now() - interval '5 weeks', admin_id),
  ((SELECT id FROM animals WHERE name='Sista'), 'https://images.unsplash.com/photo-1504595403791-c8bbd4f40dbc?w=600', true, 'Sista relaxing', now() - interval '2 months', admin_id);

-- Update AAO ID sequence
PERFORM setval('aao_id_seq', (SELECT COALESCE(MAX(CAST(REPLACE(aao_id, 'AAO-', '') AS integer)), 0) + 1 FROM animals));

END $$;
