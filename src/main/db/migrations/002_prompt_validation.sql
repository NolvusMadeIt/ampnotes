ALTER TABLE prompts ADD COLUMN validated_at TEXT;
ALTER TABLE prompts ADD COLUMN validation_provider TEXT;
ALTER TABLE prompts ADD COLUMN validation_model TEXT;
ALTER TABLE prompts ADD COLUMN validation_notes TEXT;
