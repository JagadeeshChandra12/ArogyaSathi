import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, Trash2, Loader2, Users, AlertTriangle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
  roles: string[];
}

export default function Admin() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    const [usersRes, patientsRes] = await Promise.all([
      supabase.functions.invoke("admin", { body: { action: "list_users" } }),
      supabase.from("patients").select("*").order("created_at", { ascending: false }),
    ]);
    if (usersRes.data?.users) setUsers(usersRes.data.users);
    setPatients(patientsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const handleRoleToggle = async (userId: string, role: string, hasRole: boolean) => {
    setActionLoading(`${userId}-${role}`);
    try {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: hasRole ? "remove_role" : "assign_role", userId, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `Role ${hasRole ? "removed" : "assigned"} successfully` });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePatient = async (patientId: string, patientName: string) => {
    if (!confirm(`Delete patient "${patientName}" and all their reports? This cannot be undone.`)) return;
    setActionLoading(patientId);
    try {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "delete_patient", patientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Patient deleted" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (adminLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="h-12 w-12 text-warning" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage user roles and patients</p>
        </div>

        {/* User Roles Management */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> User Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No users found</p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                        <span className="text-sm font-semibold text-accent-foreground">{u.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium">{u.full_name}</p>
                        <div className="flex gap-1 mt-1">
                          {u.roles.map((role) => (
                            <Badge key={role} variant={role === "admin" ? "default" : "secondary"} className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={u.roles.includes("admin") ? "destructive" : "outline"}
                        onClick={() => handleRoleToggle(u.user_id, "admin", u.roles.includes("admin"))}
                        disabled={actionLoading === `${u.user_id}-admin`}
                        className="gap-1"
                      >
                        {actionLoading === `${u.user_id}-admin` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Shield className="h-3 w-3" />
                        )}
                        {u.roles.includes("admin") ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Management */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Patient Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : patients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No patients found</p>
            ) : (
              <div className="space-y-3">
                {patients.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {p.patient_id} · {p.age}y · {p.gender}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletePatient(p.id, p.name)}
                      disabled={actionLoading === p.id}
                      className="gap-1"
                    >
                      {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
