import { Bell, LogOut, Moon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearSession } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Small, practical controls for the Finx MVP." />
      <Card className="divide-y divide-slate-100 p-2">
        <Row icon={Bell} title="Notifications" description="Wallet and savings alerts will connect here when the backend exposes preferences." />
        <Row icon={Moon} title="Theme" description="Light theme is optimized for the current fintech MVP." />
        <div className="p-4"><Button variant="danger" onClick={() => dispatch(clearSession())}><LogOut className="h-4 w-4" /> Log out</Button></div>
      </Card>
    </div>
  );
}

function Row({ icon: Icon, title, description }: { icon: typeof Bell; title: string; description: string }) {
  return <div className="flex items-center gap-4 p-4"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></div><div><p className="font-semibold text-slate-950">{title}</p><p className="text-sm text-slate-500">{description}</p></div></div>;
}
