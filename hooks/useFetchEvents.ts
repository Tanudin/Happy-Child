import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const useFetchEvents = (childId: string, currentMonth: Date) => {
  return useQuery({
    queryKey: ["events", childId],
    queryFn: async () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data, error } = await supabase
        .from("calendar_events")
        .select(
          "id, start_time, end_time, activity_name, child_id, notes, location",
        )
        .eq("child_id", childId)
        .gte("start_time", firstDay.toISOString())
        .lte("start_time", lastDay.toISOString());

      if (error) {
        console.error("Error fetching events:", error);
        return [];
      }
      return data || [];
    },
  });
};
