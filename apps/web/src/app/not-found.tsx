import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="max-w-lg text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-blue-50 text-blue-600">
          <SearchX className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-4xl font-semibold text-slate-950">That page is off-ledger.</h1>
        <p className="mt-3 text-slate-500">
          The route you opened does not exist in Finx. Your wallet and records are still right where they should be.
        </p>
        <Button asChild className="mt-6">
          <Link to="/app/dashboard">Back to Finx</Link>
        </Button>
      </div>
    </div>
  );
}
