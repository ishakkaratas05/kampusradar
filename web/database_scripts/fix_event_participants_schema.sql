-- Script to explicitly add missing columns to event_participants

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'event_participants' AND column_name = 'status') THEN
        ALTER TABLE public.event_participants ADD COLUMN status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved';
    END IF;
END $$;

-- Drop and recreate unique constraint just in case it's missing or has a different name
DO $$
BEGIN
    -- Ignore error if constraint doesn't exist
    ALTER TABLE public.event_participants DROP CONSTRAINT IF EXISTS unique_event_student;
    ALTER TABLE public.event_participants ADD CONSTRAINT unique_event_student UNIQUE (event_id, student_id);
EXCEPTION WHEN others THEN
    -- Ignore
END $$;

-- Add requires_approval column to events if it doesn't exist (already handled in previous script, but good to be safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'requires_approval') THEN
        ALTER TABLE public.events ADD COLUMN requires_approval BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
