import { Tasks } from "@/widgets/Tasks";
import { SimpleTodo } from "@/widgets/SimpleTodo";

export function HomePage() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Tasks />
        </div>
      </div>
      <div className="mt-4">
        <SimpleTodo />
      </div>
    </>
  );
}
