ALTER TABLE prompts ADD COLUMN display_order INTEGER;

UPDATE prompts
SET display_order = (
  SELECT COUNT(*) * 1000
  FROM prompts p2
  WHERE p2.profile_id = prompts.profile_id
    AND (
      p2.updated_at > prompts.updated_at
      OR (p2.updated_at = prompts.updated_at AND p2.id < prompts.id)
    )
);

CREATE INDEX IF NOT EXISTS idx_prompts_profile_display_order ON prompts(profile_id, display_order ASC);
