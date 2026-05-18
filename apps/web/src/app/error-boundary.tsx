import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const title = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : "We hit a snag";
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Finx could not render this screen. Try returning home.</p>
        <Button asChild className="mt-6">
          <Link to="/app/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
