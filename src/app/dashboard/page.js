import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Dashboard',
  description: 'User dashboard with authentication.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}


// src/app/dashboard/page.jsx

/*import WidgetColumns from "./WidgetColumns";


export const dynamic = "force-dynamic"; // optional: ensure fresh SSR shell

export default function DashboardPage() {
  // This page is server-rendered, but all widget calls run in the
  // client-side WidgetColumns component.
  return <WidgetColumns />;
} */
