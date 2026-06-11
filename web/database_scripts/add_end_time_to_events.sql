-- events tablosuna end_time (bitiş saati) sütununu ekler
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time VARCHAR(5);
