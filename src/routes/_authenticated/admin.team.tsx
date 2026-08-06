import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: TeamAdmin,
});

type Member = { user_id: string; email: string; role: string };

function TeamAdmin() {
  const [team, setTeam] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("list_team" as any);
    if (error) return toast.error(error.message);
    setTeam(((data as any) ?? []) as Member[]);
  };
  useEffect(() => { load(); }, []);

  const change = async (targetEmail: string, targetRole: string, grant: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("set_role_by_email" as any, {
      _email: targetEmail, _role: targetRole, _grant: grant,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(grant ? "Role granted" : "Role removed");
    setEmail("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Team & Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admins manage everything. Staff can only view and update orders.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 border border-border bg-card p-4">
        <label className="block">
          <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Account Email</div>
          <input className="w-64 border border-border bg-background px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" />
        </label>
        <label className="block">
          <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Role</div>
          <select className="border border-border bg-background px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button
          disabled={busy || !email}
          onClick={() => change(email, role, true)}
          className="inline-flex items-center gap-2 bg-foreground px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-background disabled:opacity-50"
        >
          <UserPlus className="size-3" /> Grant role
        </button>
      </div>
      <p className="text-xs text-muted-foreground">The person must have signed up at /auth first.</p>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-3">Email</th>
            <th className="py-2 pr-3">Role</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {team.map((m) => (
            <tr key={`${m.user_id}_${m.role}`} className="border-b border-border/60">
              <td className="py-2 pr-3">{m.email}</td>
              <td className="py-2 pr-3 capitalize">{m.role}</td>
              <td className="py-2 pr-3 text-right">
                <button onClick={() => change(m.email, m.role, false)} className="text-xs text-destructive underline">Remove</button>
              </td>
            </tr>
          ))}
          {team.length === 0 && <tr><td colSpan={3} className="py-10 text-center text-muted-foreground">No team members yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}