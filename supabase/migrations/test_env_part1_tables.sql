-- AAO Test Environment — Part 1: Enums, Tables, Indexes, Triggers
-- Run this FIRST in the SQL Editor of the TEST Supabase project

-- ENUMS
CREATE TYPE animal_type AS ENUM ('dog', 'cat', 'other');
CREATE TYPE sex_type AS ENUM ('male', 'female', 'unknown');
CREATE TYPE fixed_status_type AS ENUM ('fixed', 'not_fixed', 'unknown');
CREATE TYPE interested_in_fixing_type AS ENUM ('interested', 'not_interested', 'maybe');
CREATE TYPE food_bag_size_type AS ENUM ('3lb', '6lb');
CREATE TYPE size_category_type AS ENUM ('small', 'medium', 'large', 'xlarge', 'unknown');
CREATE TYPE situation_status AS ENUM (
  'supported_in_place',
  'medical_hold',
  'in_transition',
  'in_foster',
  'rehomed',
  'deceased',
  'lost_contact',
  'transferred'
);
CREATE TYPE location_status AS ENUM ('active', 'cleared', 'unknown');
CREATE TYPE outreach_event_type AS ENUM (
  'monthly_outreach',
  'spay_neuter_clinic',
  'vet_visit',
  'foster_pickup',
  'surrender',
  'other'
);
CREATE TYPE user_role AS ENUM ('admin', 'coordinator');

-- USERS
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'coordinator',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- LOCATIONS
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  name text NOT NULL,
  address text,
  precise_location text,
  latitude decimal,
  longitude decimal,
  status location_status NOT NULL DEFAULT 'active',
  notes text,
  date_added date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by uuid REFERENCES users(id)
);

-- TRANSFER RESCUES
CREATE TABLE transfer_rescues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  notes text,
  is_active boolean NOT NULL DEFAULT true
);

-- OWNERS
CREATE TABLE owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  name text NOT NULL,
  phone_primary text,
  phone_secondary text,
  address text,
  primary_location_id uuid REFERENCES locations(id),
  precise_lat decimal,
  precise_lng decimal,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by uuid REFERENCES users(id)
);

-- ANIMALS
CREATE SEQUENCE aao_id_seq START 1;

CREATE OR REPLACE FUNCTION generate_aao_id()
RETURNS text AS $$
BEGIN
  RETURN 'AAO-' || lpad(nextval('aao_id_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION compute_food_bag_size(sc size_category_type)
RETURNS food_bag_size_type AS $$
BEGIN
  IF sc IN ('small', 'medium') THEN
    RETURN '3lb'::food_bag_size_type;
  ELSE
    RETURN '6lb'::food_bag_size_type;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  legacy_uuid text,
  aao_id text NOT NULL UNIQUE DEFAULT generate_aao_id(),
  animal_type animal_type NOT NULL DEFAULT 'dog',
  count integer NOT NULL DEFAULT 1,
  name text,
  breed text,
  color text,
  sex sex_type NOT NULL DEFAULT 'unknown',
  age_estimate integer,
  birthdate date,
  weight_lbs decimal,
  size_category size_category_type NOT NULL DEFAULT 'unknown',
  food_bag_size food_bag_size_type GENERATED ALWAYS AS (compute_food_bag_size(size_category)) STORED,
  microchip_primary text,
  microchip_secondary text,
  fixed_status fixed_status_type NOT NULL DEFAULT 'unknown',
  date_fixed date,
  interested_in_fixing interested_in_fixing_type,
  urgent_medical boolean NOT NULL DEFAULT false,
  transfer_rescue_id uuid REFERENCES transfer_rescues(id),
  general_notes text,
  medical_notes text,
  deceased boolean NOT NULL DEFAULT false,
  deceased_date date,
  deceased_notes text,
  owner_id uuid REFERENCES owners(id),
  primary_location_id uuid REFERENCES locations(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by uuid REFERENCES users(id)
);

-- SITUATIONS
CREATE TABLE situations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  status situation_status NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  notes text,
  caretaker_id uuid REFERENCES owners(id),
  foster_id uuid REFERENCES owners(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_situations_one_active
  ON situations (animal_id) WHERE is_active = true;

-- OUTREACH EVENTS
CREATE TABLE outreach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type outreach_event_type NOT NULL DEFAULT 'monthly_outreach',
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  location_id uuid REFERENCES locations(id),
  notes text,
  total_food_lbs decimal,
  total_bags integer,
  status text NOT NULL DEFAULT 'completed',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outreach_event_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_event_id uuid NOT NULL REFERENCES outreach_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  UNIQUE(outreach_event_id, user_id)
);

-- CARE EVENTS
CREATE TABLE care_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  outreach_event_id uuid REFERENCES outreach_events(id),
  animal_id uuid REFERENCES animals(id),
  owner_id uuid REFERENCES owners(id),
  location_id uuid REFERENCES locations(id),
  event_date timestamptz NOT NULL DEFAULT now(),
  care_types text[] NOT NULL DEFAULT '{}',
  food_bags integer,
  food_lbs decimal,
  food_details text,
  vaccine_lot_dapp text,
  vaccine_lot_parvo text,
  vaccine_expiry date,
  preventative_product text,
  preventative_dosage text,
  microchip_placed text,
  vet_visit_date date,
  health_notes text,
  other_notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CHECKIN QUEUE
CREATE TABLE checkin_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_event_id uuid NOT NULL REFERENCES outreach_events(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES owners(id),
  queue_position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  checked_in_by uuid REFERENCES users(id),
  completed_by uuid REFERENCES users(id),
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes text,
  staged_care jsonb NOT NULL DEFAULT '[]'
);

-- FIELD NOTES
CREATE TABLE field_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid REFERENCES animals(id),
  owner_id uuid REFERENCES owners(id),
  location_id uuid REFERENCES locations(id),
  note text NOT NULL,
  flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PHOTOS
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE,
  animal_id uuid REFERENCES animals(id),
  location_id uuid REFERENCES locations(id),
  storage_path text,
  is_profile boolean NOT NULL DEFAULT false,
  caption text,
  taken_at timestamptz,
  taken_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FLAGS
CREATE TABLE flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  reason text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  resolution_note text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ACTIVITY LOG
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RECORD VERSIONS
CREATE TABLE record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  version_data jsonb NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_animals_owner ON animals(owner_id);
CREATE INDEX idx_animals_location ON animals(primary_location_id);
CREATE INDEX idx_animals_aao_id ON animals(aao_id);
CREATE INDEX idx_animals_archived ON animals(archived);
CREATE INDEX idx_animals_deceased ON animals(deceased);
CREATE INDEX idx_animals_legacy ON animals(legacy_id);
CREATE INDEX idx_situations_animal ON situations(animal_id);
CREATE INDEX idx_situations_active ON situations(animal_id) WHERE is_active = true;
CREATE INDEX idx_owners_location ON owners(primary_location_id);
CREATE INDEX idx_owners_legacy ON owners(legacy_id);
CREATE INDEX idx_owners_archived ON owners(archived);
CREATE INDEX idx_locations_legacy ON locations(legacy_id);
CREATE INDEX idx_locations_archived ON locations(archived);
CREATE INDEX idx_care_events_animal ON care_events(animal_id);
CREATE INDEX idx_care_events_outreach ON care_events(outreach_event_id);
CREATE INDEX idx_care_events_date ON care_events(event_date);
CREATE INDEX idx_care_events_legacy ON care_events(legacy_id);
CREATE INDEX idx_outreach_events_date ON outreach_events(event_date);
CREATE INDEX idx_outreach_events_location ON outreach_events(location_id);
CREATE INDEX idx_checkin_queue_event ON checkin_queue(outreach_event_id);
CREATE INDEX idx_checkin_queue_status ON checkin_queue(outreach_event_id, status);
CREATE INDEX idx_field_notes_animal ON field_notes(animal_id);
CREATE INDEX idx_field_notes_owner ON field_notes(owner_id);
CREATE INDEX idx_field_notes_location ON field_notes(location_id);
CREATE INDEX idx_field_notes_flagged ON field_notes(flagged) WHERE flagged = true;
CREATE INDEX idx_photos_animal ON photos(animal_id);
CREATE INDEX idx_photos_location ON photos(location_id);
CREATE INDEX idx_flags_record ON flags(table_name, record_id);
CREATE INDEX idx_flags_unresolved ON flags(resolved) WHERE resolved = false;
CREATE INDEX idx_activity_log_record ON activity_log(table_name, record_id);
CREATE INDEX idx_activity_log_date ON activity_log(created_at);
CREATE INDEX idx_record_versions_record ON record_versions(table_name, record_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON animals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON care_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- SEED DATA
INSERT INTO transfer_rescues (name) VALUES
  ('OSPCA'),
  ('Hawaiian Humane Society'),
  ('Oʻahu SPCA'),
  ('Other');

-- SAMPLE LOCATIONS
INSERT INTO locations (name, address, latitude, longitude) VALUES
  ('Waianae Boat Harbor', 'Waianae, HI', 21.4389, -158.1836),
  ('Makaha Beach Park', 'Makaha, HI', 21.4734, -158.2175),
  ('Nanakuli Beach Park', 'Nanakuli, HI', 21.3889, -158.1542);
