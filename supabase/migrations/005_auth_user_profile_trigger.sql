-- Ensure public.users profile rows are automatically created for new auth users
-- This is critical because the app (Option A) queries public.users by auth.uid() for company_id/role.

-- 1) Allow the trigger function to insert into public.users even with RLS.
--    Uses SECURITY DEFINER so it runs with the function owner's privileges.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	-- If the profile row already exists, do nothing
	IF EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.id) THEN
		RETURN NEW;
	END IF;

	INSERT INTO public.users (id, email, role, created_at)
	VALUES (NEW.id, NEW.email, 'employee', NOW());

	RETURN NEW;
END;
$$;

-- 2) Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- 3) Ensure RLS is enabled on public.users and policies allow users to read/update their own profile row
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
	FOR SELECT
	USING (id = auth.uid());

-- Allow authenticated users to update their own profile (non-privileged fields)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
	FOR UPDATE
	USING (id = auth.uid())
	WITH CHECK (id = auth.uid());

-- Allow insert for own profile row (mainly for edge cases; trigger does the insert)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
	FOR INSERT
	WITH CHECK (id = auth.uid());

SELECT '005 auth user profile trigger migration completed' as status;