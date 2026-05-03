import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, FileText, Brain, Loader2, Download, Trash2, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { jsPDF } from "jspdf";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import AppLayout from "@/components/AppLayout";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patient, setPatient] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [s3Result, setS3Result] = useState<{ file_url: string; summary: string } | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [pRes, rRes, sRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("reports").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("summaries").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
    ]);
    setPatient(pRes.data);
    setReports(rRes.data ?? []);
    setSummaries(sRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const extractPdfText = async (data: ArrayBuffer): Promise<string> => {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, i) => {
        const page = await pdf.getPage(i + 1);
        const content = await page.getTextContent();
        return content.items.map((x: any) => x.str).join(" ");
      })
    );
    return pages.join("\n").trim();
  };

  const handleReExtract = async (report: any) => {
    if (!user) return;
    setExtracting(report.id);
    try {
      // Download the file from storage
      const filePath = report.file_url.split("/medical-reports/")[1];
      if (!filePath) throw new Error("Invalid file path");

      const { data: fileData, error: dlError } = await supabase.storage
        .from("medical-reports")
        .download(filePath);
      if (dlError) throw dlError;
      if (!fileData) throw new Error("File not found");

      const ext = report.file_name.toLowerCase().split(".").pop();
      let extractedText = "";

      if (ext === "txt" || report.file_type === "text/plain") {
        extractedText = await fileData.text();
      } else if (ext === "pdf" || report.file_type === "application/pdf") {
        extractedText = await extractPdfText(await fileData.arrayBuffer());
      } else {
        throw new Error("Unsupported file type for text extraction");
      }

      if (!extractedText.trim()) {
        toast({ title: "No text found", description: "The file doesn't contain extractable text.", variant: "destructive" });
        return;
      }

      const { error: updateError } = await supabase
        .from("reports")
        .update({ extracted_text: extractedText })
        .eq("id", report.id);
      if (updateError) throw updateError;

      toast({ title: "Text extracted successfully", description: `${extractedText.length} characters extracted.` });
      loadData();
    } catch (error: any) {
      toast({ title: "Extraction failed", description: error.message, variant: "destructive" });
    } finally {
      setExtracting(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("medical-reports").upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("medical-reports").getPublicUrl(path);

        // Extract text based on file type or extension
        const extLower = (ext || "").toLowerCase();
        let extractedText = "";
        try {
          if (file.type === "text/plain" || extLower === "txt") {
            extractedText = await file.text();
          } else if (file.type === "application/pdf" || extLower === "pdf") {
            extractedText = await extractPdfText(await file.arrayBuffer());
          }
        } catch (extractErr) {
          console.warn("Text extraction failed for", file.name, extractErr);
        }

        const { error: insertError } = await supabase.from("reports").insert({
          patient_id: id,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type || ext || "unknown",
          extracted_text: extractedText || null,
          uploaded_by: user.id,
        });
        if (insertError) throw insertError;
      }
      toast({ title: `${files.length} report(s) uploaded` });
      loadData();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSummarize = async () => {
    if (!user || !patient) return;
    const textsToSummarize = reports
      .map((r) => r.extracted_text)
      .filter(Boolean);

    if (textsToSummarize.length === 0) {
      toast({ title: "No text to summarize", description: "Upload text reports or reports with extracted text first.", variant: "destructive" });
      return;
    }

    setSummarizing(true);
    setS3Result(null);
    try {
      const { data, error } = await supabase.functions.invoke("summarize", {
        body: {
          extractedTexts: textsToSummarize,
          patientName: patient.name,
          patientAge: patient.age,
          patientGender: patient.gender,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save to local record
      const { error: insertError } = await supabase.from("summaries").insert({
        patient_id: patient.id,
        summary_text: data.summary,
        generated_by: user.id,
      });
      if (insertError) throw insertError;

      // NEW FLOW: Generate PDF and Upload to Backend
      setIsProcessingPdf(true);
      const pdfBlob = generatePdfBlob(data.summary, patient);
      
      const formData = new FormData();
      formData.append("file", pdfBlob, "report.pdf");

      const response = await fetch("/upload.php", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Backend upload failed (Status: ${response.status})`);
      
      const responseText = await response.text();
      let resultData;
      try {
        const first = responseText.indexOf('{');
        const last = responseText.lastIndexOf('}');
        if (first !== -1 && last !== -1) {
          resultData = JSON.parse(responseText.substring(first, last + 1));
        } else {
          throw new Error("Invalid response format");
        }
      } catch (e) {
        console.error("Full server response:", responseText);
        throw new Error("Server returned non-JSON response.");
      }
      setS3Result(resultData);
      
      toast({ title: "Report uploaded successfully", description: "S3 link and summary generated." });
      loadData();
    } catch (error: any) {
      toast({ title: "Process failed", description: error.message, variant: "destructive" });
    } finally {
      setSummarizing(false);
      setIsProcessingPdf(false);
    }
  };

  const handleGenerateAndViewS3 = async (summaryText: string) => {
    setIsProcessingPdf(true);
    setS3Result(null);
    try {
      const pdfBlob = generatePdfBlob(summaryText, patient);
      const formData = new FormData();
      formData.append("file", pdfBlob, "report.pdf");
      const response = await fetch("/upload.php", { method: "POST", body: formData });
      if (!response.ok) throw new Error(`Backend upload failed (Status: ${response.status})`);
      
      const responseText = await response.text();
      let data;
      try {
        const first = responseText.indexOf('{');
        const last = responseText.lastIndexOf('}');
        if (first !== -1 && last !== -1) {
          data = JSON.parse(responseText.substring(first, last + 1));
        } else {
          throw new Error("Invalid response format");
        }
      } catch (e) {
        console.error("Full server response:", responseText);
        throw new Error("Server returned non-JSON response.");
      }
      setS3Result(data);
      toast({ title: "Report uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessingPdf(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Patient not found</p>
          <Button variant="outline" onClick={() => navigate("/patients")} className="mt-4">Go to Patients</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/patients")} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </Button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center">
              <span className="text-2xl font-bold text-accent-foreground">{patient.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{patient.name}</h1>
              <p className="text-muted-foreground">ID: {patient.patient_id} · {patient.age} years · {patient.gender}</p>
            </div>
          </div>
          <Button onClick={handleSummarize} disabled={summarizing || isProcessingPdf || reports.length === 0} className="gradient-primary text-primary-foreground gap-2">
            {summarizing || isProcessingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {summarizing ? "Generating..." : isProcessingPdf ? "Uploading..." : "Generate Summary"}
          </Button>
        </div>

        {s3Result && (
          <Card className="border-green-500/30 bg-green-50/20 animate-in zoom-in-95 duration-500 border-2">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold uppercase tracking-wider text-xs">Report Processed Successfully</span>
              </div>
              <CardTitle className="text-xl">AI Report Ready</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-lg border border-green-100 shadow-sm">
                <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-2">Backend Summary</h4>
                <p className="text-foreground text-sm italic whitespace-pre-wrap">
                  "{s3Result.summary}"
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild size="sm" className="gap-2">
                  <a href={s3Result.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    View Report (S3)
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setS3Result(null)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4" /> Reports ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="summaries" className="gap-2">
              <Brain className="h-4 w-4" /> Summaries ({summaries.length})
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" /> Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            <Card className="shadow-card">
              <CardContent className="p-5">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-accent/30 transition-colors">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium">{uploading ? "Uploading..." : "Click to upload reports"}</p>
                    <p className="text-sm text-muted-foreground mt-1">PDF, images, or text files</p>
                  </div>
                </Label>
                <Input id="file-upload" type="file" className="hidden" multiple accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx" onChange={handleUpload} disabled={uploading} />
              </CardContent>
            </Card>

            {reports.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No reports uploaded yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id} className="shadow-card">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{report.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString()} · {report.file_type}
                            {report.extracted_text ? (
                              <span className="text-success"> · ✓ Text extracted</span>
                            ) : (
                              <span className="text-warning"> · No text extracted</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {!report.extracted_text && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1"
                          onClick={() => handleReExtract(report)}
                          disabled={extracting === report.id}
                        >
                          {extracting === report.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileText className="h-3.5 w-3.5" />
                          )}
                          {extracting === report.id ? "Extracting..." : "Extract Text"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summaries" className="space-y-4">
            {summaries.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Brain className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No summaries generated yet</p>
                  <p className="text-sm mt-1">Upload reports and click "Generate Summary"</p>
                </CardContent>
              </Card>
            ) : (
              summaries.map((summary) => (
                <Card key={summary.id} className="shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Generated on {new Date(summary.created_at).toLocaleString()}
                    </CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={isProcessingPdf}
                        onClick={() => handleGenerateAndViewS3(summary.summary_text)}
                      >
                        {isProcessingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        View Report (S3)
                      </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: formatMarkdown(summary.summary_text) }} />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            {(() => {
              const items = [
                ...reports.map((r) => ({ type: "report" as const, date: r.created_at, data: r })),
                ...summaries.map((s) => ({ type: "summary" as const, date: s.created_at, data: s })),
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              if (items.length === 0) {
                return (
                  <Card className="shadow-card">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No activity yet</p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <div className="relative">
                  <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-6">
                    {items.map((item, i) => (
                      <div key={`${item.type}-${item.data.id}`} className="relative flex gap-4 pl-0">
                        <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background ${item.type === "report" ? "bg-accent" : "gradient-primary"}`}>
                          {item.type === "report" ? (
                            <FileText className="h-4 w-4 text-accent-foreground" />
                          ) : (
                            <Brain className="h-4 w-4 text-primary-foreground" />
                          )}
                        </div>
                        <Card className="flex-1 shadow-card">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  {new Date(item.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                                  {" · "}
                                  {new Date(item.date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                </p>
                                {item.type === "report" ? (
                                  <>
                                    <p className="font-medium">Report uploaded</p>
                                    <p className="text-sm text-muted-foreground truncate">{item.data.file_name} · {item.data.file_type}</p>
                                    {item.data.extracted_text && (
                                      <p className="text-xs text-muted-foreground mt-1">✓ Text extracted</p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="font-medium">AI Summary generated</p>
                                    <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
                                      {item.data.summary_text.replace(/[#*\-]/g, "").substring(0, 200)}...
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 mt-2"
                                      disabled={isProcessingPdf}
                                      onClick={() => handleGenerateAndViewS3(item.data.summary_text)}
                                    >
                                      {isProcessingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                                      View Report (S3)
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function generatePdfBlob(summaryText: string, patient: any): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Medical Summary", margin, y);
  y += 12;

  // Patient info
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Patient: ${patient.name}  |  ID: ${patient.patient_id}  |  Age: ${patient.age}  |  Gender: ${patient.gender}`, margin, y);
  y += 6;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Body
  doc.setTextColor(30, 30, 30);
  const lines = summaryText.split("\n");

  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }

    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      y += 4;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const heading = trimmed.replace(/^##\s*/, "");
      doc.text(heading, margin, y);
      y += 8;
    } else if (trimmed.startsWith("### ")) {
      y += 2;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const heading = trimmed.replace(/^###\s*/, "");
      doc.text(heading, margin, y);
      y += 7;
    } else if (trimmed.startsWith("- ")) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const bullet = trimmed.replace(/^-\s*/, "");
      const clean = bullet.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
      const wrapped = doc.splitTextToSize(`• ${clean}`, maxWidth - 5);
      for (const wl of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
        doc.text(wl, margin + 5, y);
        y += 5;
      }
    } else if (trimmed === "") {
      y += 3;
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const clean = trimmed.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
      const wrapped = doc.splitTextToSize(clean, maxWidth);
      for (const wl of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
        doc.text(wl, margin, y);
        y += 5;
      }
    }
  }

  return doc.output("blob");
}

function formatMarkdown(text: string): string {
  return text
    .replace(/## (.*)/g, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/### (.*)/g, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/- (.*)/g, '<li class="ml-4">$1</li>')
    .replace(/\n/g, "<br />");
}
