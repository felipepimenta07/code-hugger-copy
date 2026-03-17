import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Building2, Users, AlertCircle } from 'lucide-react';
import { parseLinkedInCSV } from '@/utils/linkedinParser';
import { ParsedLinkedInData, LinkedInImportOptions } from '@/types/linkedin';
import { toast } from 'sonner';

type ParsedDataWithHeaders = ParsedLinkedInData & { detectedHeaders: string[] };

interface LinkedInImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ParsedLinkedInData, options: LinkedInImportOptions) => void;
  projects: any[];
}

export const LinkedInImportModal = ({ open, onOpenChange, onImport, projects }: LinkedInImportModalProps) => {
  const [parsedData, setParsedData] = useState<ParsedLinkedInData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [options, setOptions] = useState<LinkedInImportOptions>({
    createBrands: true,
    connectToProject: false,
    projectId: undefined,
    defaultCategory: 'A'
  });

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    try {
      const content = await file.text();
      const parsed = parseLinkedInCSV(content);
      setParsedData(parsed);
      toast.success(`${parsed.totalContacts} contatos encontrados!`);
    } catch (error) {
      toast.error('Erro ao processar arquivo: ' + (error as Error).message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = () => {
    if (!parsedData) return;
    onImport(parsedData, options);
    onOpenChange(false);
    setParsedData(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setParsedData(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="text-[#0A66C2]" />
            Importar Contatos do LinkedIn
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!parsedData ? (
            <>
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto mb-4 text-muted-foreground" size={48} />
                <h3 className="text-lg font-semibold mb-2">Arraste o arquivo CSV aqui</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ou clique para selecionar
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="csv-upload"
                />
                <Button asChild variant="outline">
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <FileText className="mr-2" size={16} />
                    Selecionar CSV
                  </label>
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="text-muted-foreground flex-shrink-0" size={20} />
                  <div className="text-sm space-y-2">
                    <p className="font-medium">Como exportar seus contatos do LinkedIn:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Acesse Settings & Privacy no LinkedIn</li>
                      <li>Vá em Data Privacy → Get a copy of your data</li>
                      <li>Selecione "Connections" e baixe o CSV</li>
                      <li>Faça upload do arquivo aqui</li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <Users className="text-primary mb-2" size={24} />
                  <p className="text-2xl font-bold">{parsedData.totalContacts}</p>
                  <p className="text-sm text-muted-foreground">Contatos</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <Building2 className="text-primary mb-2" size={24} />
                  <p className="text-2xl font-bold">{parsedData.uniqueCompanies.length}</p>
                  <p className="text-sm text-muted-foreground">Empresas únicas</p>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createBrands"
                    checked={options.createBrands}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, createBrands: checked as boolean })
                    }
                  />
                  <Label htmlFor="createBrands" className="cursor-pointer">
                    Criar marcas automaticamente a partir das empresas
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="connectToProject"
                    checked={options.connectToProject}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, connectToProject: checked as boolean })
                    }
                  />
                  <Label htmlFor="connectToProject" className="cursor-pointer">
                    Conectar todos a um projeto específico
                  </Label>
                </div>

                {options.connectToProject && (
                  <div className="ml-6 space-y-2">
                    <Label>Selecione o projeto:</Label>
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

                <div className="space-y-2">
                  <Label>Categoria padrão para pessoas:</Label>
                  <Select
                    value={options.defaultCategory}
                    onValueChange={(value) => setOptions({ ...options, defaultCategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Alta prioridade</SelectItem>
                      <SelectItem value="M">M - Média prioridade</SelectItem>
                      <SelectItem value="B">B - Baixa prioridade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sample Preview */}
              <div className="bg-muted/50 rounded-lg p-4 max-h-40 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Primeiros contatos:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {parsedData.contacts.slice(0, 5).map((contact, idx) => (
                    <li key={idx}>
                      {contact.firstName} {contact.lastName}
                      {contact.company && ` - ${contact.company}`}
                    </li>
                  ))}
                  {parsedData.contacts.length > 5 && (
                    <li className="italic">... e mais {parsedData.contacts.length - 5} contatos</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {parsedData && (
            <Button onClick={handleImport} className="bg-[#0A66C2] hover:bg-[#004182]">
              Importar {parsedData.totalContacts} Contatos
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
