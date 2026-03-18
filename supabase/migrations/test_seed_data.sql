-- AAO Test Environment — Sample Seed Data
-- Run this in the SQL Editor of the TEST Supabase project (aao-test)
-- Make sure you've already created the shauna user account first

-- ============================================================
-- Get the admin user ID for created_by references
-- ============================================================
DO $$
DECLARE
  admin_id uuid;
  loc_waianae uuid;
  loc_makaha uuid;
  loc_nanakuli uuid;
  loc_maili uuid;
  loc_lualualei uuid;
  loc_waipahu uuid;
  loc_kapolei uuid;
  owner_kimo uuid;
  owner_leilani uuid;
  owner_malia uuid;
  owner_keanu uuid;
  owner_nalani uuid;
  owner_tua uuid;
  owner_pikake uuid;
  animal_1 uuid;
  animal_2 uuid;
  animal_3 uuid;
  animal_4 uuid;
  animal_5 uuid;
  animal_6 uuid;
  animal_7 uuid;
  animal_8 uuid;
  animal_9 uuid;
  animal_10 uuid;
  animal_11 uuid;
  animal_12 uuid;
  event_1 uuid;
  event_2 uuid;
BEGIN

-- Get admin user
SELECT id INTO admin_id FROM auth.users WHERE email = 'shauna@alohaanimaloutreach.org' LIMIT 1;

-- ============================================================
-- LOCATIONS (add more to the 3 already created)
-- ============================================================

-- Get existing location IDs
SELECT id INTO loc_waianae FROM locations WHERE name = 'Waianae Boat Harbor' LIMIT 1;
SELECT id INTO loc_makaha FROM locations WHERE name = 'Makaha Beach Park' LIMIT 1;
SELECT id INTO loc_nanakuli FROM locations WHERE name = 'Nanakuli Beach Park' LIMIT 1;

INSERT INTO locations (id, name, address, latitude, longitude, status) VALUES
  (gen_random_uuid(), 'Māʻili Beach Park', 'Māʻili, HI', 21.4175, -158.1717, 'active'),
  (gen_random_uuid(), 'Lualualei Homesteads', 'Waiʻanae, HI', 21.4295, -158.1650, 'active'),
  (gen_random_uuid(), 'Waipahu Community Park', 'Waipahu, HI', 21.3867, -158.0117, 'active'),
  (gen_random_uuid(), 'Kapolei Regional Park', 'Kapolei, HI', 21.3350, -158.0800, 'active');

SELECT id INTO loc_maili FROM locations WHERE name = 'Māʻili Beach Park' LIMIT 1;
SELECT id INTO loc_lualualei FROM locations WHERE name = 'Lualualei Homesteads' LIMIT 1;
SELECT id INTO loc_waipahu FROM locations WHERE name = 'Waipahu Community Park' LIMIT 1;
SELECT id INTO loc_kapolei FROM locations WHERE name = 'Kapolei Regional Park' LIMIT 1;

-- ============================================================
-- OWNERS
-- ============================================================

INSERT INTO owners (id, name, phone_primary, address, primary_location_id, notes, created_by) VALUES
  (gen_random_uuid(), 'Kimo Nakamura', '808-555-1234', '85-123 Farrington Hwy', loc_waianae, 'Long-time community member, feeds strays regularly', admin_id),
  (gen_random_uuid(), 'Leilani Kaʻahanui', '808-555-2345', '84-200 Makaha Valley Rd', loc_makaha, 'Has a large yard, takes in fosters occasionally', admin_id),
  (gen_random_uuid(), 'Malia Torres', '808-555-3456', '89-100 Nanakuli Ave', loc_nanakuli, 'Single mom, needs food assistance for her dogs', admin_id),
  (gen_random_uuid(), 'Keanu Park', '808-555-4567', '87-150 Māʻili Cove', loc_maili, 'Elderly, limited mobility — we deliver food', admin_id),
  (gen_random_uuid(), 'Nalani Reyes', '808-555-5678', '85-900 Lualualei Hmstd Rd', loc_lualualei, 'Community organizer, helps coordinate events', admin_id),
  (gen_random_uuid(), 'Tua Faʻamatala', '808-555-6789', '94-300 Waipahu St', loc_waipahu, 'Recently moved from west side, two dogs', admin_id),
  (gen_random_uuid(), 'Pikake Medeiros', '808-555-7890', '91-500 Kapolei Pkwy', loc_kapolei, 'Vet tech volunteer, great with nervous dogs', admin_id);

SELECT id INTO owner_kimo FROM owners WHERE name = 'Kimo Nakamura' LIMIT 1;
SELECT id INTO owner_leilani FROM owners WHERE name = 'Leilani Kaʻahanui' LIMIT 1;
SELECT id INTO owner_malia FROM owners WHERE name = 'Malia Torres' LIMIT 1;
SELECT id INTO owner_keanu FROM owners WHERE name = 'Keanu Park' LIMIT 1;
SELECT id INTO owner_nalani FROM owners WHERE name = 'Nalani Reyes' LIMIT 1;
SELECT id INTO owner_tua FROM owners WHERE name = 'Tua Faʻamatala' LIMIT 1;
SELECT id INTO owner_pikake FROM owners WHERE name = 'Pikake Medeiros' LIMIT 1;

-- ============================================================
-- ANIMALS
-- ============================================================

INSERT INTO animals (id, name, breed, color, sex, age_estimate, size_category, fixed_status, owner_id, primary_location_id, general_notes, created_by) VALUES
  (gen_random_uuid(), 'Mochi', 'Pit Bull Mix', 'Brindle', 'female', 3, 'large', 'fixed', owner_kimo, loc_waianae, 'Very friendly, loves belly rubs. Good with kids.', admin_id),
  (gen_random_uuid(), 'Bruddah', 'Hawaiian Poi Dog Mix', 'Brown/White', 'male', 5, 'large', 'not_fixed', owner_kimo, loc_waianae, 'Kimo''s main dog. Protective but gentle. Interested in fixing.', admin_id),
  (gen_random_uuid(), 'Liko', 'Chihuahua Mix', 'Tan', 'male', 2, 'small', 'not_fixed', owner_leilani, loc_makaha, 'Tiny but fearless. Barks at everything.', admin_id),
  (gen_random_uuid(), 'Nani', 'Lab Mix', 'Black', 'female', 4, 'large', 'fixed', owner_leilani, loc_makaha, 'Calm and sweet. Was a foster that stayed.', admin_id),
  (gen_random_uuid(), 'Koa', 'German Shepherd Mix', 'Black/Tan', 'male', 6, 'xlarge', 'fixed', owner_malia, loc_nanakuli, 'Big boy, protective of the kids. Good on leash.', admin_id),
  (gen_random_uuid(), 'Pua', 'Terrier Mix', 'White/Brown', 'female', 1, 'small', 'not_fixed', owner_malia, loc_nanakuli, 'Young and hyper. Needs spay — Malia interested.', admin_id),
  (gen_random_uuid(), 'Duke', 'Mastiff Mix', 'Fawn', 'male', 8, 'xlarge', 'fixed', owner_keanu, loc_maili, 'Senior dog, gentle giant. Needs joint supplements.', admin_id),
  (gen_random_uuid(), 'Hoku', 'Mixed Breed', 'Golden', 'female', 3, 'medium', 'not_fixed', owner_nalani, loc_lualualei, 'Community dog that Nalani feeds. Semi-feral but warming up.', admin_id),
  (gen_random_uuid(), 'Pono', 'Pit Bull', 'Grey', 'male', 4, 'large', 'not_fixed', owner_tua, loc_waipahu, 'Friendly with people, reactive with other dogs.', admin_id),
  (gen_random_uuid(), 'Maile', 'Lab/Pit Mix', 'Chocolate', 'female', 2, 'large', 'fixed', owner_tua, loc_waipahu, 'Tua''s second dog. Very social and playful.', admin_id),
  (gen_random_uuid(), 'Kai', 'Australian Shepherd Mix', 'Merle', 'male', 5, 'medium', 'fixed', owner_pikake, loc_kapolei, 'High energy, needs lots of exercise. Pikake runs with him.', admin_id),
  (gen_random_uuid(), 'Peanut', 'Dachshund Mix', 'Red', 'female', 7, 'small', 'fixed', owner_pikake, loc_kapolei, 'Senior small dog, a little overweight. Sweet temperament.', admin_id);

SELECT id INTO animal_1 FROM animals WHERE name = 'Mochi' LIMIT 1;
SELECT id INTO animal_2 FROM animals WHERE name = 'Bruddah' LIMIT 1;
SELECT id INTO animal_3 FROM animals WHERE name = 'Liko' LIMIT 1;
SELECT id INTO animal_4 FROM animals WHERE name = 'Nani' LIMIT 1;
SELECT id INTO animal_5 FROM animals WHERE name = 'Koa' LIMIT 1;
SELECT id INTO animal_6 FROM animals WHERE name = 'Pua' LIMIT 1;
SELECT id INTO animal_7 FROM animals WHERE name = 'Duke' LIMIT 1;
SELECT id INTO animal_8 FROM animals WHERE name = 'Hoku' LIMIT 1;
SELECT id INTO animal_9 FROM animals WHERE name = 'Pono' LIMIT 1;
SELECT id INTO animal_10 FROM animals WHERE name = 'Maile' LIMIT 1;
SELECT id INTO animal_11 FROM animals WHERE name = 'Kai' LIMIT 1;
SELECT id INTO animal_12 FROM animals WHERE name = 'Peanut' LIMIT 1;

-- ============================================================
-- SITUATIONS (current status for each animal)
-- ============================================================

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by) VALUES
  (animal_1, 'supported_in_place', true, now() - interval '6 months', NULL, admin_id),
  (animal_2, 'supported_in_place', true, now() - interval '1 year', NULL, admin_id),
  (animal_3, 'supported_in_place', true, now() - interval '3 months', NULL, admin_id),
  (animal_4, 'supported_in_place', true, now() - interval '8 months', NULL, admin_id),
  (animal_5, 'supported_in_place', true, now() - interval '2 years', NULL, admin_id),
  (animal_6, 'supported_in_place', true, now() - interval '2 months', NULL, admin_id),
  (animal_7, 'medical_hold', true, now() - interval '2 weeks', 'Limping on front left leg, vet visit scheduled', admin_id),
  (animal_8, 'in_transition', true, now() - interval '1 month', 'Semi-feral, building trust before foster placement', admin_id),
  (animal_9, 'supported_in_place', true, now() - interval '5 months', NULL, admin_id),
  (animal_10, 'supported_in_place', true, now() - interval '4 months', NULL, admin_id),
  (animal_11, 'supported_in_place', true, now() - interval '1 year', NULL, admin_id),
  (animal_12, 'supported_in_place', true, now() - interval '1 year', NULL, admin_id);

-- Set interested_in_fixing for unfixed animals
UPDATE animals SET interested_in_fixing = 'interested' WHERE id IN (animal_2, animal_6);
UPDATE animals SET interested_in_fixing = 'not_interested' WHERE id = animal_3;
UPDATE animals SET interested_in_fixing = 'maybe' WHERE id = animal_8;
UPDATE animals SET urgent_medical = true WHERE id = animal_7;

-- ============================================================
-- PHOTOS (using free placeholder dog images)
-- ============================================================

INSERT INTO photos (animal_id, storage_path, is_profile, caption, taken_at, taken_by) VALUES
  (animal_1, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600', true, 'Mochi at the harbor', now() - interval '2 months', admin_id),
  (animal_2, 'https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?w=600', true, 'Bruddah hanging out', now() - interval '3 months', admin_id),
  (animal_3, 'https://images.unsplash.com/photo-1583337130417-13104dec14a3?w=600', true, 'Little Liko', now() - interval '1 month', admin_id),
  (animal_4, 'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=600', true, 'Nani at the beach', now() - interval '4 months', admin_id),
  (animal_5, 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=600', true, 'Koa on guard', now() - interval '1 month', admin_id),
  (animal_6, 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600', true, 'Pua being hyper', now() - interval '3 weeks', admin_id),
  (animal_7, 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=600', true, 'Duke resting', now() - interval '2 months', admin_id),
  (animal_9, 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=600', true, 'Pono looking tough', now() - interval '2 months', admin_id),
  (animal_10, 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=600', true, 'Maile at the park', now() - interval '1 month', admin_id),
  (animal_11, 'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=600', true, 'Kai after a run', now() - interval '3 weeks', admin_id),
  (animal_12, 'https://images.unsplash.com/photo-1612195583950-b8fd34c87093?w=600', true, 'Peanut napping', now() - interval '2 months', admin_id);

-- Hoku has no photo (semi-feral, hard to photograph)

-- Extra photos for some animals
INSERT INTO photos (animal_id, storage_path, is_profile, caption, taken_at, taken_by) VALUES
  (animal_1, 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=600', false, 'Mochi with Kimo', now() - interval '5 months', admin_id),
  (animal_5, 'https://images.unsplash.com/photo-1553882809-a4f57e59501d?w=600', false, 'Koa with the kids', now() - interval '3 months', admin_id);

-- ============================================================
-- OUTREACH EVENTS (2 past events)
-- ============================================================

INSERT INTO outreach_events (id, event_type, event_date, location_id, notes, status, total_food_lbs, total_bags, created_by) VALUES
  (gen_random_uuid(), 'monthly_outreach', (CURRENT_DATE - interval '30 days')::date, loc_waianae, 'Good turnout, warm day', 'completed', 72, 16, admin_id),
  (gen_random_uuid(), 'monthly_outreach', (CURRENT_DATE - interval '60 days')::date, loc_nanakuli, 'Rainy but still saw most regulars', 'completed', 54, 12, admin_id);

SELECT id INTO event_1 FROM outreach_events WHERE notes = 'Good turnout, warm day' LIMIT 1;
SELECT id INTO event_2 FROM outreach_events WHERE notes = 'Rainy but still saw most regulars' LIMIT 1;

-- ============================================================
-- CARE EVENTS (food, vaccines, preventatives from past outreach)
-- ============================================================

-- Event 1 (30 days ago at Waiʻanae) — Kimo's dogs + Keanu's dog
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by) VALUES
  (event_1, animal_1, owner_kimo, loc_waianae, now() - interval '30 days', ARRAY['food', 'vaccines'], 1, 6, admin_id),
  (event_1, animal_2, owner_kimo, loc_waianae, now() - interval '30 days', ARRAY['food', 'preventatives'], 1, 6, admin_id),
  (event_1, animal_7, owner_keanu, loc_waianae, now() - interval '30 days', ARRAY['food'], 1, 6, admin_id);

-- Event 1 — Nalani's dog + Leilani's dogs
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by) VALUES
  (event_1, animal_8, owner_nalani, loc_waianae, now() - interval '30 days', ARRAY['food'], 1, 3, admin_id),
  (event_1, animal_3, owner_leilani, loc_waianae, now() - interval '30 days', ARRAY['food', 'vaccines'], 1, 3, admin_id),
  (event_1, animal_4, owner_leilani, loc_waianae, now() - interval '30 days', ARRAY['food', 'preventatives'], 1, 6, admin_id);

-- Event 2 (60 days ago at Nānākuli) — Malia's dogs
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by) VALUES
  (event_2, animal_5, owner_malia, loc_nanakuli, now() - interval '60 days', ARRAY['food', 'vaccines', 'preventatives'], 1, 6, admin_id),
  (event_2, animal_6, owner_malia, loc_nanakuli, now() - interval '60 days', ARRAY['food'], 1, 3, admin_id);

-- Event 2 — Tua's dogs
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by) VALUES
  (event_2, animal_9, owner_tua, loc_nanakuli, now() - interval '60 days', ARRAY['food', 'preventatives'], 1, 6, admin_id),
  (event_2, animal_10, owner_tua, loc_nanakuli, now() - interval '60 days', ARRAY['food'], 1, 6, admin_id);

-- Standalone care (vet visit for Duke)
INSERT INTO care_events (animal_id, owner_id, location_id, event_date, care_types, health_notes, created_by) VALUES
  (animal_7, owner_keanu, loc_maili, now() - interval '10 days', ARRAY['medical'], 'X-ray shows mild arthritis in front left. Prescribed Rimadyl. Recheck in 4 weeks.', admin_id);

-- ============================================================
-- FIELD NOTES
-- ============================================================

INSERT INTO field_notes (animal_id, owner_id, location_id, note, flagged, flag_reason, created_by, created_at) VALUES
  (animal_8, owner_nalani, loc_lualualei, 'Hoku let me get within 5 feet today — big progress! She ate from a bowl while I sat nearby.', false, NULL, admin_id, now() - interval '2 weeks'),
  (animal_7, owner_keanu, loc_maili, 'Duke seems to be limping more. Keanu says it started 3 days ago. Recommend vet visit.', true, 'Needs vet attention', admin_id, now() - interval '3 weeks'),
  (animal_2, owner_kimo, loc_waianae, 'Kimo asked again about getting Bruddah fixed. He is ready — just needs a ride to the clinic.', true, 'Interested in spay/neuter', admin_id, now() - interval '1 week'),
  (NULL, NULL, loc_makaha, 'Saw 2 unfamiliar dogs near the parking lot. Tan and white, medium size, no collars. Will check again next visit.', true, 'New animals spotted', admin_id, now() - interval '5 days'),
  (animal_6, owner_malia, loc_nanakuli, 'Pua is getting bigger fast. Malia confirmed she wants to get her spayed. Added to S/N interest list.', false, NULL, admin_id, now() - interval '10 days');

-- ============================================================
-- FLAGS
-- ============================================================

INSERT INTO flags (table_name, record_id, reason, resolved, created_by, created_at) VALUES
  ('animals', animal_7, 'Duke limping — needs vet follow-up', false, admin_id, now() - interval '3 weeks'),
  ('animals', animal_2, 'Bruddah — owner wants neuter, needs transport arranged', false, admin_id, now() - interval '1 week'),
  ('animals', animal_8, 'Hoku — semi-feral, monitor socialization progress', false, admin_id, now() - interval '1 month');

-- ============================================================
-- CHECKIN QUEUE (from Event 1 — all completed)
-- ============================================================

INSERT INTO checkin_queue (outreach_event_id, owner_id, queue_position, status, checked_in_by, completed_by, checked_in_at, completed_at, staged_care) VALUES
  (event_1, owner_kimo, 1, 'completed', admin_id, admin_id, now() - interval '30 days', now() - interval '30 days' + interval '15 minutes', '[{"animal_id": "' || animal_1 || '", "services": ["food", "vaccines"]}, {"animal_id": "' || animal_2 || '", "services": ["food", "preventatives"]}]'::jsonb),
  (event_1, owner_keanu, 2, 'completed', admin_id, admin_id, now() - interval '30 days' + interval '5 minutes', now() - interval '30 days' + interval '20 minutes', '[{"animal_id": "' || animal_7 || '", "services": ["food"]}]'::jsonb),
  (event_1, owner_nalani, 3, 'completed', admin_id, admin_id, now() - interval '30 days' + interval '10 minutes', now() - interval '30 days' + interval '25 minutes', '[{"animal_id": "' || animal_8 || '", "services": ["food"]}]'::jsonb),
  (event_1, owner_leilani, 4, 'completed', admin_id, admin_id, now() - interval '30 days' + interval '12 minutes', now() - interval '30 days' + interval '30 minutes', '[{"animal_id": "' || animal_3 || '", "services": ["food", "vaccines"]}, {"animal_id": "' || animal_4 || '", "services": ["food", "preventatives"]}]'::jsonb);

END $$;
