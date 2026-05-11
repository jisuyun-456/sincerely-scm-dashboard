import { Tasks } from "@/widgets/Tasks";
import { SimpleTodo } from "@/widgets/SimpleTodo";
import { CalendarWidget } from "@/widgets/CalendarWidget";

export function HomePage() {
  return (
    <>
      <Tasks />
      <div className="mt-4">
        <SimpleTodo />
      </div>
      <div className="mt-4">
        <CalendarWidget />
      </div>
    </>
  );
}
