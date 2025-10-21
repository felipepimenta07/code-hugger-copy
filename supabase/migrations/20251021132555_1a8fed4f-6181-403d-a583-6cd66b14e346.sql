-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create workflows table
CREATE TABLE public.workflows (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text,
  status text DEFAULT 'ativo',
  deadline date,
  x numeric DEFAULT 0,
  y numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create people table
CREATE TABLE public.people (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  company text,
  category text,
  email text,
  phone text,
  x numeric DEFAULT 0,
  y numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create brands table
CREATE TABLE public.brands (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text,
  website text,
  x numeric DEFAULT 0,
  y numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create connections table
CREATE TABLE public.connections (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_id bigint NOT NULL,
  from_type text NOT NULL,
  to_id bigint NOT NULL,
  to_type text NOT NULL,
  connection_type text DEFAULT 'strong',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create many-to-many relationship tables
CREATE TABLE public.project_workflows (
  project_id bigint REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  workflow_id bigint REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (project_id, workflow_id)
);

CREATE TABLE public.person_workflows (
  person_id bigint REFERENCES people(id) ON DELETE CASCADE NOT NULL,
  workflow_id bigint REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (person_id, workflow_id)
);

CREATE TABLE public.brand_workflows (
  brand_id bigint REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  workflow_id bigint REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (brand_id, workflow_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_workflows ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for workflows
CREATE POLICY "Users can view their own workflows"
  ON public.workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
  ON public.workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON public.workflows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
  ON public.workflows FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for people
CREATE POLICY "Users can view their own people"
  ON public.people FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own people"
  ON public.people FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own people"
  ON public.people FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own people"
  ON public.people FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for brands
CREATE POLICY "Users can view their own brands"
  ON public.brands FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brands"
  ON public.brands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brands"
  ON public.brands FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brands"
  ON public.brands FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for connections
CREATE POLICY "Users can view their own connections"
  ON public.connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
  ON public.connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
  ON public.connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for relationship tables
CREATE POLICY "Users can manage their project workflows"
  ON public.project_workflows FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their person workflows"
  ON public.person_workflows FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.people
    WHERE id = person_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their brand workflows"
  ON public.brand_workflows FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands
    WHERE id = brand_id AND user_id = auth.uid()
  ));

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;

-- Trigger to create profile automatically on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();