import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, ExternalLink, CheckCircle2, History, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";

interface UploadHistory {
  id: string;
  file_url: string;
  summary: string;
  timestamp: string;
  fileName: string;
}

export default function ReportSummary() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<{ file_url: string; summary: string } | null>(null);
  const [history, setHistory] = useState<UploadHistory[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("upload_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 5 : prev));
      }, 300);

      const response = await fetch("/upload.php", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Server error:", errorData);
        throw new Error(`Upload failed (Status: ${response.status}). Server returned error.`);
      }

      const responseText = await response.text();
      let data;
      try {
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          data = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
        } else {
          throw new Error("Invalid response format");
        }
      } catch (e) {
        console.error("Full server response:", responseText);
        throw new Error("Server did not return a valid JSON response.");
      }
      
      if (!data.file_url || !data.summary) {
        throw new Error("Invalid response from server");
      }

      setResult(data);
      toast.success("Report uploaded and summarized successfully!");

      // Update history
      const newEntry: UploadHistory = {
        id: crypto.randomUUID(),
        file_url: data.file_url,
        summary: data.summary,
        timestamp: new Date().toLocaleString(),
        fileName: file.name
      };

      const updatedHistory = [newEntry, ...history];
      setHistory(updatedHistory);
      localStorage.setItem("upload_history", JSON.stringify(updatedHistory));

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred while uploading. Please try again.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-indigo-600 to-primary bg-clip-text text-transparent">
            Medical Report Summarizer
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload your medical reports and get instant AI-powered summaries.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Upload Card */}
          <Card className="shadow-elevated border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden border-2">
            <CardHeader className="bg-primary/5 pb-8 pt-6">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload New Report
              </CardTitle>
              <CardDescription>Supported formats: PDF, PNG, JPG (Max 10MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div 
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 bg-accent/5 hover:bg-accent/10 transition-all cursor-pointer relative group ${file ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/20'}`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <div className="text-center space-y-4">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto transition-all ${file ? 'bg-primary/20 scale-110' : 'bg-primary/10 group-hover:scale-110'}`}>
                    <FileText className={`h-8 w-8 ${file ? 'text-primary' : 'text-primary/70'}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">{file ? file.name : "Click or drag to upload report"}</p>
                    <p className="text-sm text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "The report will be processed immediately"}</p>
                  </div>
                  {file && !isUploading && (
                    <Button variant="outline" size="sm" className="relative z-20 pointer-events-none">
                      Change File
                    </Button>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Analyzing report content...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2.5" />
                </div>
              )}

              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading} 
                className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all gradient-primary text-primary-foreground group"
              >
                {isUploading ? "Processing Report..." : (
                  <span className="flex items-center gap-2">
                    Generate Summary
                    <CheckCircle2 className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Result Card */}
          {result && (
            <Card className="shadow-elevated border-green-500/30 bg-green-50/20 animate-in zoom-in-95 duration-500 border-2">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-bold uppercase tracking-wider text-xs">Analysis Complete</span>
                </div>
                <CardTitle className="text-2xl">Generated Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-white/80 dark:bg-slate-900/80 p-6 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm transition-all hover:shadow-md">
                  <p className="text-foreground leading-relaxed text-lg italic whitespace-pre-wrap">
                    "{result.summary}"
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild className="gap-2">
                    <a href={result.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      View Uploaded Report
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => { setFile(null); setResult(null); }}>
                    Upload Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* History Section */}
          {history.length > 0 && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <History className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold">Recent Summaries</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { localStorage.removeItem("upload_history"); setHistory([]); }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Clear History
                </Button>
              </div>
              <div className="grid gap-4">
                {history.map((item) => (
                  <Card key={item.id} className="group hover:border-primary/40 transition-all bg-card/40 border border-border/50 shadow-sm hover:shadow-md overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 flex-grow">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <h4 className="font-semibold text-base line-clamp-1">{item.fileName}</h4>
                          </div>
                          <div className="relative">
                            <p className="text-sm text-muted-foreground line-clamp-2 pl-9">
                              "{item.summary}"
                            </p>
                          </div>
                          <div className="flex items-center gap-3 pl-9 pt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.timestamp}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 flex sm:flex-col gap-2">
                          <Button asChild variant="secondary" size="sm" className="gap-2">
                            <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
