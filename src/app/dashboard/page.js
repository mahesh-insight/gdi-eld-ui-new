export const metadata = {
  title: 'Dashboard',
  description: 'Learn more about our company.',
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold underline">Dashboard</h1>
      <p>This is the content for the dashboard page.</p>
    </div>
  );
}


// src/app/dashboard/page.jsx

/*import WidgetColumns from "./WidgetColumns";


export const dynamic = "force-dynamic"; // optional: ensure fresh SSR shell

export default function DashboardPage() {
  // This page is server-rendered, but all widget calls run in the
  // client-side WidgetColumns component.
  return <WidgetColumns />;
} */
