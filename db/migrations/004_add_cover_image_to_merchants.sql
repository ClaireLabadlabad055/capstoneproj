-- Migration: add a cover_image column for merchant/ vendor cover photos
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS cover_image text;
