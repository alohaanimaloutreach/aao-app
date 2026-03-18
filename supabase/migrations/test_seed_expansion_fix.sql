-- Fix script: The expansion partially ran — animals/owners exist but situations/care/notes/flags/photos don't.
-- This script adds the missing data safely.

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
  loc_ewa uuid;
  loc_kalaeloa uuid;
  loc_makua uuid;
  loc_pokai uuid;
  loc_paiolu uuid;
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid;
  o6 uuid; o7 uuid; o8 uuid; o9 uuid; o10 uuid;
  o11 uuid; o12 uuid; o13 uuid; o14 uuid; o15 uuid;
  o16 uuid; o17 uuid; o18 uuid; o19 uuid; o20 uuid;
  o21 uuid; o22 uuid; o23 uuid; o24 uuid; o25 uuid;
  ev3 uuid; ev4 uuid; ev5 uuid; ev6 uuid; ev7 uuid; ev8 uuid;
BEGIN

SELECT id INTO admin_id FROM auth.users WHERE email = 'shauna@alohaanimaloutreach.org' LIMIT 1;

-- Get location IDs
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

-- Get owner IDs
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

-- Set interested_in_fixing for some unfixed dogs
UPDATE animals SET interested_in_fixing = 'interested' WHERE name IN ('Shadow', 'Patches', 'Ginger', 'Coconut', 'Rex', 'Bella', 'Makani', 'Hope') AND interested_in_fixing IS NULL;
UPDATE animals SET interested_in_fixing = 'not_interested' WHERE name IN ('Tiny', 'Soldier') AND interested_in_fixing IS NULL;
UPDATE animals SET interested_in_fixing = 'maybe' WHERE name IN ('Bandit', 'Ghost', 'Stitch', 'Simba') AND interested_in_fixing IS NULL;
UPDATE animals SET urgent_medical = true WHERE name IN ('Warrior', 'Kūpuna') AND urgent_medical = false;

-- ============================================================
-- SITUATIONS — only for animals that don't have one yet
-- ============================================================

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'supported_in_place', true, now() - (random() * interval '365 days'), NULL, admin_id
FROM animals a
WHERE a.name IN (
  'Luna','Shadow','Tank','Sista','Tiny','Patches','Coco','Bandit','Rosie','Chief','Misty',
  'Pepper','Ginger','Soldier','Princess','Bear','Coconut','Rex','Taro','Poi',
  'Bella','Oreo','Reef','Wrench','Diesel','Aloha','Makani','Simba','Atlas','Athena',
  'Lucky','Rambo','Stitch','Queenie','Scooter','Mama Dog','Rusty','Tippy'
)
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'in_foster', true, now() - interval '2 weeks', 'Foster with Kalei Pacheco — FAF placement', admin_id
FROM animals a WHERE a.name = 'Sunny'
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'in_foster', true, now() - interval '3 weeks', 'Foster with Kalei Pacheco — K9 Kokua', admin_id
FROM animals a WHERE a.name = 'Zeus'
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'medical_hold', true, now() - interval '1 week', 'Severe arthritis, vet monitoring', admin_id
FROM animals a WHERE a.name = 'Warrior'
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'medical_hold', true, now() - interval '5 days', 'Age-related decline, comfort care', admin_id
FROM animals a WHERE a.name = 'Kūpuna'
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'supported_in_place', true, now() - interval '2 months', 'Puppy from stray litter', admin_id
FROM animals a WHERE a.name IN ('Pebbles','Bam Bam','Dino','Mocha','Latte')
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'in_transition', true, now() - interval '3 weeks', 'Building trust, semi-feral', admin_id
FROM animals a WHERE a.name = 'Ghost'
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'in_transition', true, now() - interval '2 weeks', 'Semi-feral near base', admin_id
FROM animals a WHERE a.name = 'Stitch'
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'lost_contact', true, now() - interval '2 months', 'Haven''t seen Lehua in a while, remote area', admin_id
FROM animals a WHERE a.name = 'Keiki'
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

INSERT INTO situations (animal_id, status, is_active, started_at, notes, created_by)
SELECT a.id, 'supported_in_place', true, now() - interval '6 months', NULL, admin_id
FROM animals a WHERE a.name = 'Hope'
AND NOT EXISTS (SELECT 1 FROM situations s WHERE s.animal_id = a.id AND s.is_active = true);

-- ============================================================
-- OUTREACH EVENTS
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
-- CARE EVENTS
-- ============================================================

-- Event 3 (14 days ago, Maili)
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

-- Event 4 (45 days ago, Makaha)
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

-- Event 5 (75 days ago, Lualualei)
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

-- Event 6 (90 days ago, Waianae)
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

-- Event 8 (150 days ago, holiday at Nanakuli)
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev8, a.id, o5, loc_nanakuli, now() - interval '150 days', ARRAY['food','vaccines','preventatives'], 1, 3, admin_id FROM animals a WHERE a.name = 'Pepper';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev8, a.id, o5, loc_nanakuli, now() - interval '150 days', ARRAY['food'], 1, 3, admin_id FROM animals a WHERE a.name = 'Ginger';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev8, a.id, o16, loc_nanakuli, now() - interval '150 days', ARRAY['food','vaccines'], 1, 6, admin_id FROM animals a WHERE a.name = 'Bella';
INSERT INTO care_events (outreach_event_id, animal_id, owner_id, location_id, event_date, care_types, food_bags, food_lbs, created_by)
SELECT ev8, a.id, o16, loc_nanakuli, now() - interval '150 days', ARRAY['food'], 1, 3, admin_id FROM animals a WHERE a.name = 'Oreo';

-- ============================================================
-- FIELD NOTES
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
-- FLAGS
-- ============================================================

INSERT INTO flags (table_name, record_id, reason, resolved, created_by, created_at) VALUES
  ('animals', (SELECT id FROM animals WHERE name='Warrior'), 'Warrior — hip dysplasia, needs pain management plan', false, admin_id, now() - interval '3 days'),
  ('animals', (SELECT id FROM animals WHERE name='Coconut'), 'Coconut — in heat, urgent spay needed before unwanted litter', false, admin_id, now() - interval '2 days'),
  ('animals', (SELECT id FROM animals WHERE name='Soldier'), 'Soldier — possible flea infestation, bring preventatives', false, admin_id, now() - interval '6 days'),
  ('animals', (SELECT id FROM animals WHERE name='Reef'), 'Reef — ate something on beach, monitor for recurring GI issues', false, admin_id, now() - interval '5 days'),
  ('owners', o18, 'Lehua — hard to reach, remote location, road access issues', false, admin_id, now() - interval '12 days'),
  ('animals', (SELECT id FROM animals WHERE name='Ghost'), 'Ghost — semi-feral progress, continue socialization tracking', false, admin_id, now() - interval '1 month');

-- Resolved flags
INSERT INTO flags (table_name, record_id, reason, resolved, resolved_by, resolved_at, resolution_note, created_by, created_at) VALUES
  ('animals', (SELECT id FROM animals WHERE name='Chief'), 'Chief — overdue for vaccines', true, admin_id, now() - interval '40 days', 'Vaccinated at Makaha outreach event', admin_id, now() - interval '50 days'),
  ('animals', (SELECT id FROM animals WHERE name='Luna'), 'Luna — seemed underweight at last visit', true, admin_id, now() - interval '85 days', 'Weight checked, back to normal after food increase', admin_id, now() - interval '95 days'),
  ('animals', (SELECT id FROM animals WHERE name='Mama Dog'), 'Mama Dog — possible pregnancy', true, admin_id, now() - interval '200 days', 'Confirmed not pregnant, spay completed', admin_id, now() - interval '210 days');

-- ============================================================
-- PHOTOS
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
