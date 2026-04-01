import { supabase } from "./supabase";

export async function deleteCurrentUserAccount(): Promise<{ error: unknown }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: userError || new Error("No authenticated user found.") };
    }

    const { error: rpcError } = await supabase.rpc("delete_my_account");

    if (rpcError) {
      return { error: rpcError };
    }

    await supabase.auth.signOut();
    return { error: null };
  } catch (error) {
    return { error };
  }
}
