import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const useFetchCustodySchedules = (childId: string) => {
  return useQuery({
    queryKey: ["custodySchedules", childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custody_schedules")
        .select("id, days_of_week, color, user_id")
        .eq("child_id", childId);

      if (error) {
        console.error("Error fetching custody schedules:", error);
        return [];
      }
      const schedulesWithNames =
        data?.map((schedule, index) => ({
          ...schedule,
          parent_name: `Parent ${index + 1}`, // Simple name since we don't have profile table
        })) || [];

      return data || [];
    },
  });
};
