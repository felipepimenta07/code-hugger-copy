-- Expand people table to capture complete vCard data from WhatsApp
ALTER TABLE people 
  ADD COLUMN phone_secondary TEXT,
  ADD COLUMN phone_work TEXT,
  ADD COLUMN email_secondary TEXT,
  ADD COLUMN address TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN birthday DATE,
  ADD COLUMN notes TEXT,
  ADD COLUMN profile_picture_url TEXT,
  ADD COLUMN department TEXT;

-- Add comment for documentation
COMMENT ON COLUMN people.phone_secondary IS 'Secondary phone number from contact';
COMMENT ON COLUMN people.phone_work IS 'Work phone number from contact';
COMMENT ON COLUMN people.email_secondary IS 'Secondary email from contact';
COMMENT ON COLUMN people.address IS 'Full address from contact vCard';
COMMENT ON COLUMN people.website IS 'Personal or professional website URL';
COMMENT ON COLUMN people.birthday IS 'Contact birthday date';
COMMENT ON COLUMN people.notes IS 'Additional notes or observations';
COMMENT ON COLUMN people.profile_picture_url IS 'URL to profile picture if available';
COMMENT ON COLUMN people.department IS 'Department within company';