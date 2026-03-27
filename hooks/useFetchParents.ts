import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const useFetchParents = (childId: string) => {
  return useQuery({
    queryKey: ["parents", childId],
    queryFn: async () => {
      const { data: userChildrenData, error: userChildrenError } =
        await supabase
          .from("user_children")
          .select("user_id")
          .eq("child_id", childId);

      if (userChildrenError) {
        console.error("Error fetching user_children:", userChildrenError);
        return;
      }

      if (!userChildrenData || userChildrenData.length === 0) {
        console.log("No parents found for child:", childId);
        return [];
      }

      // Get the user IDs
      const userIds = userChildrenData.map((uc) => uc.user_id);

      // Fetch user profiles for those user IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, email, display_name, first_name, last_name")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return;
      }

      console.log("Found profiles:", profilesData);

      // Get current user to add "(You)" indicator
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Create parent list with colors
      const colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#FFA07A",
        "#98D8C8",
        "#F3A683",
        "#786FA6",
        "#F8B500",
      ];
      const parentList = (profilesData || []).map(
        (profile: any, index: number) => {
          // Get name from profile - prefer display_name
          let name = "";
          if (profile.display_name) {
            name = profile.display_name;
          } else if (profile.first_name && profile.last_name) {
            name = `${profile.first_name} ${profile.last_name}`;
          } else if (profile.email) {
            name = profile.email;
          } else {
            name = `Guardian ${index + 1}`;
          }

          // If this is the current user, add "(You)" indicator
          if (user && profile.user_id === user.id) {
            name = `${name} (You)`;
          }

          return {
            id: profile.user_id,
            name: name,
            color: colors[index % colors.length],
          };
        },
      );
      return parentList;
    },
  });
};
