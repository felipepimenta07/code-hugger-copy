import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Building2, Users, AlertCircle, X, Loader2, Brain } from 'lucide-react';
import { parseLinkedInCSV, mergeLinkedInData } from '@/utils/linkedinParser';
import { ParsedLinkedInData, LinkedInImportOptions, LinkedInFileEntry, LinkedInEnrichedData } from '@/types/linkedin';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type ParsedDataWithHeaders = ParsedLinkedInData & { detectedHeaders: string[] };

interface LinkedInImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ParsedLinkedInData, options: LinkedInImportOptions, enriched?: LinkedInEnrichedData) => void;
  projects: any[];
}

export const LinkedInImportModal = ({ open, onOpenChange, onImport, projects }: LinkedInImportModalProps) => {
  const [files, setFiles] = useState<LinkedInFileEntry[]>([]);
  const [mergedData, setMergedData] = useState<ParsedDataWithHeaders | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enrichedData, setEnrichedData] = useState<LinkedInEnrichedData | null>(null);
  const [options, setOptions] = useState<LinkedInImportOptions>({
    createBrands: true,
    connectToProject: false,
    projectId: undefined,
    defaultCategory: 'linkedin'
  });

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }
    // Prevent duplicate files
    if (files.some(f => f.fileName === file.name)) {
      toast.error(`Arquivo "${file.name}" já foi adicionado`);
      return;
    }

    try {
      const content = await file.text();
      const parsed = parseLinkedInCSV(content);
      if (parsed.totalContacts === 0) {
        toast.error(`Nenhum contato encontrado em "${file.name}".`);
        return;
      }
      const entry: LinkedInFileEntry = { fileName: file.name, data: parsed };
      const newFiles = [...files, entry];
      setFiles(newFiles);

      // Re-merge all
      const merged = mergeLinkedInData(newFiles.map(f => f.data));
      setMergedData(merged);
      setEnrichedData(null); // Reset enrichment when files change
      toast.success(`${parsed.totalContacts} contatos de "${file.name}"`);
    } catch (error) {
      toast.error('Erro ao processar: ' + (error as Error).message);
    }
  }, [files]);

  const removeFile = (fileName: string) => {
    const newFiles = files.filter(f => f.fileName !== fileName);
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setMergedData(null);
      setEnrichedData(null);
    } else {
      const merged = mergeLinkedInData(newFiles.map(f => f.data));
      setMergedData(merged);
      setEnrichedData(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(f => processFile(f));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(f => processFile(f));
    e.target.value = ''; // Reset so same file can be re-added
  };

  const analyzeWithAI = async () => {
    if (!mergedData) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-linkedin', {
        body: { contacts: mergedData.contacts, companies: mergedData.uniqueCompanies }
      });
      if (error) throw error;
      setEnrichedData(data as LinkedInEnrichedData);
      toast.success('Análise IA concluída!');
    } catch (err) {
      console.error('AI analysis error:', err);
      toast.error('Erro na análise IA. Você pode importar sem enriquecimento.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = () => {
    if (!mergedData) return;
    onImport(mergedData, options, enrichedData || undefined);
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setFiles([]);
    setMergedData(null);
    setEnrichedData(null);
    setIsAnalyzing(false);
  };

  // Group contacts by company for preview
  const companyGroups = mergedData ? (() => {
    const groups: Record<string, number> = {};
    let noCompany = 0;
    for (const c of mergedData.contacts) {
      if (c.company?.trim()) {
        groups[c.company.trim()] = (groups[c.company.trim()] || 0) + 1;
      } else {
        noCompany++;
      }
    }
    return { groups, noCompany };
  })() : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="text-[#0A66C2]" />
            Importar Contatos do LinkedIn
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Upload Area — always visible when no merged data */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto mb-3 text-muted-foreground" size={40} />
            <h3 className="text-base font-semibold mb-1">
              {files.length === 0 ? 'Arraste seus CSVs aqui' : 'Adicionar mais CSVs'}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Suporta múltiplos arquivos — os contatos são mesclados automaticamente
            </p>
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="csv-upload-multi"
            />
            <Button asChild variant="outline" size="sm">
              <label htmlFor="csv-upload-multi" className="cursor-pointer">
                <FileText className="mr-2" size={14} />
                Selecionar CSVs
              </label>
            </Button>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Arquivos carregados</p>
              {files.map(f => (
                <div key={f.fileName} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2 text-sm">
                  <span className="truncate">{f.fileName} — <span className="text-muted-foreground">{f.data.totalContacts} contatos</span></span>
                  <button onClick={() => removeFile(f.fileName)} className="text-muted-foreground hover:text-destructive ml-2"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Merged preview */}
          {mergedData && companyGroups && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Users className="mx-auto text-primary mb-1" size={20} />
                  <p className="text-xl font-bold">{mergedData.totalContacts}</p>
                  <p className="text-xs text-muted-foreground">Contatos</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Building2 className="mx-auto text-primary mb-1" size={20} />
                  <p className="text-xl font-bold">{mergedData.uniqueCompanies.length}</p>
                  <p className="text-xs text-muted-foreground">Empresas (flows)</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Users className="mx-auto text-muted-foreground mb-1" size={20} />
                  <p className="text-xl font-bold">{companyGroups.noCompany}</p>
                  <p className="text-xs text-muted-foreground">Sem empresa</p>
                </div>
              </div>

              {/* AI Enrichment */}
              <div className="bg-muted/30 border border-border/40 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={18} className="text-primary" />
                    <div>
                      <p className="text-sm font-medium">Análise Inteligente (IA)</p>
                      <p className="text-xs text-muted-foreground">Detecta setores, países e conexões fracas</p>
                    </div>
                  </div>
                  {!enrichedData ? (
                    <Button size="sm" variant="outline" onClick={analyzeWithAI} disabled={isAnalyzing}>
                      {isAnalyzing ? <><Loader2 size={14} className="animate-spin mr-1" /> Analisando...</> : 'Analisar'}
                    </Button>
                  ) : (
                    <span className="text-xs text-green-500 font-medium">✓ Concluída</span>
                  )}
                </div>

                {enrichedData && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-background/50 rounded p-2">
                      <p className="font-medium">{Object.keys(enrichedData.companySectors).length}</p>
                      <p className="text-muted-foreground">Setores</p>
                    </div>
                    <div className="bg-background/50 rounded p-2">
                      <p className="font-medium">{Object.keys(enrichedData.companyCountries).length}</p>
                      <p className="text-muted-foreground">Países</p>
                    </div>
                    <div className="bg-background/50 rounded p-2">
                      <p className="font-medium">{enrichedData.weakConnections.length}</p>
                      <p className="text-muted-foreground">Conexões fracas</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Company groups preview */}
              <div className="bg-muted/50 rounded-lg p-3 max-h-36 overflow-y-auto">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Empresas → Flows que serão criados:</p>
                <ul className="text-xs space-y-1">
                  {Object.entries(companyGroups.groups)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 15)
                    .map(([company, count]) => (
                      <li key={company} className="flex justify-between">
                        <span className="truncate">{company}</span>
                        <span className="text-muted-foreground ml-2">{count} pessoas</span>
                      </li>
                    ))}
                  {Object.keys(companyGroups.groups).length > 15 && (
                    <li className="italic text-muted-foreground">... e mais {Object.keys(companyGroups.groups).length - 15} empresas</li>
                  )}
                  {companyGroups.noCompany > 0 && (
                    <li className="flex justify-between text-muted-foreground">
                      <span className="italic">Sem empresa</span>
                      <span>{companyGroups.noCompany} pessoas</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="connectToProject"
                    checked={options.connectToProject}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, connectToProject: checked as boolean })
                    }
                  />
                  <Label htmlFor="connectToProject" className="cursor-pointer text-sm">
                    Conectar todos a um projeto específico
                  </Label>
                </div>

                {options.connectToProject && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm">Selecione o projeto:</Label>
                    <Select
                      value={options.projectId?.toString()}
                      onValueChange={(value) =>
                        setOptions({ ...options, projectId: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Info badge */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                <AlertCircle size={14} />
                Todos os contatos serão importados com categoria <span className="font-mono font-medium text-[#0A66C2]">linkedin</span>
              </div>
            </>
          )}

          {/* Instructions — only when no files */}
          {files.length === 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="text-muted-foreground flex-shrink-0" size={20} />
                <div className="text-sm space-y-2">
                  <p className="font-medium">Como exportar seus contatos do LinkedIn:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Acesse Settings & Privacy no LinkedIn</li>
                    <li>Vá em Data Privacy → Get a copy of your data</li>
                    <li>Selecione "Connections" e baixe o CSV</li>
                    <li>Faça upload do(s) arquivo(s) aqui</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {mergedData && (
            <Button onClick={handleImport} className="bg-[#0A66C2] hover:bg-[#004182]">
              Importar {mergedData.totalContacts} Contatos
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
