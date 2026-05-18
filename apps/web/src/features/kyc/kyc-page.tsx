import { BadgeCheck, FileUp, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

export default function KycPage() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="KYC verification" description="Submit identity details so Finx can unlock higher wallet limits." />
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{submitted ? "Verification under review" : "Basic verification required"}</h2>
            <p className="mt-1 text-sm text-slate-500">KYC endpoints are not exposed in the current backend. The frontend flow is ready for document submission integration.</p>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        {submitted ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-700">
            <BadgeCheck className="h-8 w-8" />
            <p className="mt-3 font-semibold">Your KYC submission is queued for review.</p>
          </div>
        ) : (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
            <Select defaultValue="BVN"><option>BVN</option><option>NIN</option><option>Passport</option></Select>
            <Input placeholder="Identity number" />
            <Input className="sm:col-span-2" type="file" />
            <Button className="sm:col-span-2"><FileUp className="h-4 w-4" /> Submit verification</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
