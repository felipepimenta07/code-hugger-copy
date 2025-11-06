-- Add home_project_id column to people table
ALTER TABLE public.people 
ADD COLUMN home_project_id bigint;

-- Add home_project_id column to brands table
ALTER TABLE public.brands 
ADD COLUMN home_project_id bigint;

-- Add indexes for better query performance
CREATE INDEX idx_people_home_project_id ON public.people(home_project_id);
CREATE INDEX idx_brands_home_project_id ON public.brands(home_project_id);