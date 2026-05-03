import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
      setPatients(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.patient_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
            <p className="text-muted-foreground mt-1">{patients.length} patients registered</p>
          </div>
          <Link to="/patients/new">
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Add Patient
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No patients found</p>
              <Link to="/patients/new">
                <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add Patient</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((patient) => (
              <Link key={patient.id} to={`/patients/${patient.id}`}>
                <Card className="shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-accent-foreground">{patient.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{patient.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {patient.patient_id}</p>
                        <p className="text-sm text-muted-foreground">{patient.age} years · {patient.gender}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
