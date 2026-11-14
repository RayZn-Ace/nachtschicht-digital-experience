import { supabase } from "@/integrations/supabase/client";
import { withDeadline } from "@/lib/readDeadline";

// Token attachment only; every receiving function still verifies authorization.
export const getSessionBounded = () => withDeadline(supabase.auth.getSession());