"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "invited";
  joinedAt: string;
}

export default function TeamsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "member",
  });
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "tenants", user.uid, "members"));
    const unsub = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          joinedAt: data.joinedAt?.toDate
            ? data.joinedAt.toDate().toLocaleDateString()
            : "Recently",
        } as Member;
      });
      setMembers(membersData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteForm.email) return;
    setIsInviting(true);
    try {
      await addDoc(collection(db, "tenants", user.uid, "members"), {
        ...inviteForm,
        status: "invited",
        joinedAt: Timestamp.now(),
      });

      // Send invite email
      await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: inviteForm.email,
          subject: `You're invited to join a workspace on AI Receptionist`,
          text: `Hi ${inviteForm.name || "there"},\n\nYou've been invited to join a workspace on AI Receptionist.\n\nPlease sign up or log in to accept your invite.`,
          html: `<p>Hi ${inviteForm.name || "there"},</p><p>You've been invited to join a workspace on <b>AI Receptionist</b>.</p><p><a href="${window.location.origin}/sign-up">Click here to join</a> or log in to accept your invite.</p>`,
        }),
      });

      setIsInviteOpen(false);
      setInviteForm({ name: "", email: "", role: "member" });
    } catch (err) {
      console.error("Invite error:", err);
    } finally {
      setIsInviting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm("Remove this team member?")) return;
    await deleteDoc(doc(db, "tenants", user.uid, "members", id));
  };

  const filtered = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <div className="flex h-[400px] items-center justify-center text-zinc-500">
        Loading team...
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Team Management
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {members.length} members ·{" "}
            {members.filter((m) => m.status === "invited").length} pending
            invites
          </p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger>
            <Button className="gap-2 bg-violet-600 hover:bg-violet-500">
              <UserPlus className="h-4 w-4" />
              Invite member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-white/[0.08] text-white">
            <DialogHeader>
              <DialogTitle>Invite a team member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Full Name
                </label>
                <Input
                  value={inviteForm.name}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, name: e.target.value })
                  }
                  className="bg-white/[0.03] border-white/[0.08]"
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Email Address
                </label>
                <Input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  className="bg-white/[0.03] border-white/[0.08]"
                  placeholder="jane@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      role: e.target.value as any,
                    })
                  }
                  className="w-full rounded-md border border-white/[0.08] bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="submit"
                  disabled={isInviting}
                  className="w-full bg-violet-600 hover:bg-violet-500"
                >
                  {isInviting ? "Sending..." : "Send invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="bg-zinc-900/60 border-white/[0.06] pl-10 h-10"
        />
      </div>

      {/* Member Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => (
            <Card
              key={member.id}
              className="border-white/[0.06] bg-zinc-900/80 group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 border border-white/[0.06] text-zinc-400 font-bold uppercase">
                      {member.name?.[0] || member.email?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-white truncate">
                        {member.name || "Pending Invite"}
                      </p>
                      <p className="text-[12px] text-zinc-500 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      member.role === "admin"
                        ? "text-violet-400 border-violet-500/20 bg-violet-500/10"
                        : "text-zinc-400 border-white/10 bg-white/5",
                    )}
                  >
                    {member.role === "admin" ? (
                      <Shield className="h-3 w-3" />
                    ) : (
                      <Users className="h-3 w-3" />
                    )}
                    <span className="capitalize">{member.role}</span>
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-medium",
                      member.status === "active"
                        ? "text-emerald-400"
                        : "text-amber-400",
                    )}
                  >
                    {member.status === "active" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {member.status === "active" ? "Active" : "Pending"}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.04]">
                  <p className="text-[10px] text-zinc-600">
                    Joined on {member.joinedAt}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-20 text-center">
          <Users className="h-10 w-10 text-zinc-700 mb-4" />
          <p className="text-[14px] font-medium text-zinc-400">
            No members found
          </p>
          <p className="mt-1 text-[12px] text-zinc-600">
            Try adjusting your search or invite someone new.
          </p>
        </div>
      )}
    </div>
  );
}
