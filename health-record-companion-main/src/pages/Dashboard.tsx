import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Brain, Plus, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function Dashboard() {
  const [stats, setStats] = useState({ patients: 0, reports: 0, summaries: 0 });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [p, r, s, recent] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("summaries").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({ patients: p.count ?? 0, reports: r.count ?? 0, summaries: s.count ?? 0 });
      setRecentPatients(recent.data ?? []);
    }
    load();
  }, []);

  const statCards = [
    { label: "Total Patients", value: stats.patients, icon: Users, color: "text-primary" },
    { label: "Reports Uploaded", value: stats.reports, icon: FileText, color: "text-secondary" },
    { label: "Summaries Generated", value: stats.summaries, icon: Brain, color: "text-accent-foreground" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your patient management system</p>
          </div>
          <div className="flex gap-2">
            <Link to="/report-summary">
              <Button variant="outline" className="gap-2">
                <Brain className="h-4 w-4" /> Summarize Report
              </Button>
            </Link>
            <Link to="/patients/new">
              <Button className="gradient-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Add Patient
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.label} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Patients</CardTitle>
            <Link to="/patients">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPatients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No patients yet. Add your first patient to get started.</p>
            ) : (
              <div className="space-y-3">
                {recentPatients.map((patient) => (
                  <Link key={patient.id} to={`/patients/${patient.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                        <span className="text-sm font-semibold text-accent-foreground">{patient.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">ID: {patient.patient_id} · {patient.age}y · {patient.gender}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
