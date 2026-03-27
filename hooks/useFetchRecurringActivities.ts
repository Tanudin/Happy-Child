import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const useFetchRecurringActivities = (childId: string) => {
  return useQuery({
    queryKey: ["recurringActivities", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_activities")
        .select("id, day_of_week, time, color, user_id")
        .eq("child_id", childId);

      if (error) {
        console.error("Error fetching recurring activities:", error);
        return [];
      }

      return data || [];
    },
  });
};
