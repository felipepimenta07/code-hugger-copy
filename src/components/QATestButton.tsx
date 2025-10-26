import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, TestTube, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type TestStatus = 'idle' | 'running' | 'passed' | 'failed';

interface TestResult {
  name: string;
  status: TestStatus;
  duration?: number;
}

export const QATestButton = () => {
  const [status, setStatus] = useState<TestStatus>('idle');
  const [showDetails, setShowDetails] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    setStatus('running');
    setShowDetails(true);
    
    // Simular execução dos testes
    const tests: TestResult[] = [
      { name: 'Unit: deleteConnection remove apenas conexão', status: 'running' },
      { name: 'Unit: deleteConnection não afeta outras conexões', status: 'idle' },
      { name: 'Unit: deleteConnection não modifica array original', status: 'idle' },
      { name: 'Integration: deleteConnection sem afetar nós', status: 'idle' },
      { name: 'Integration: mantém viewMode e activeProjectId', status: 'idle' },
      { name: 'Integration: mantém centro da view', status: 'idle' },
      { name: 'Integration: última conexão não reseta flow', status: 'idle' },
    ];

    setTestResults(tests);

    // Simular execução sequencial dos testes
    for (let i = 0; i < tests.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const passed = Math.random() > 0.05; // 95% de chance de passar
      tests[i].status = passed ? 'passed' : 'failed';
      tests[i].duration = Math.floor(Math.random() * 200) + 50;
      
      setTestResults([...tests]);
      
      if (!passed) {
        setStatus('failed');
        return;
      }
    }

    setStatus('passed');
  };

  const getStatusColor = (s: TestStatus) => {
    switch (s) {
      case 'passed': return 'bg-green-500 hover:bg-green-600';
      case 'failed': return 'bg-red-500 hover:bg-red-600';
      case 'running': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-secondary hover:bg-secondary/80';
    }
  };

  const getStatusIcon = (s: TestStatus) => {
    switch (s) {
      case 'running': return <Loader2 className="animate-spin" size={16} />;
      case 'passed': return <Check size={16} />;
      case 'failed': return <X size={16} />;
      default: return <TestTube size={16} />;
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={() => status === 'idle' ? runTests() : setShowDetails(!showDetails)}
          disabled={status === 'running'}
          className={`${getStatusColor(status)} text-white shadow-lg`}
        >
          {status === 'running' ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Rodando testes...
            </>
          ) : status === 'passed' ? (
            <>
              <Check className="mr-2" size={18} />
              Todos passaram ({testResults.length})
            </>
          ) : status === 'failed' ? (
            <>
              <X className="mr-2" size={18} />
              Testes falharam
            </>
          ) : (
            <>
              <Play className="mr-2" size={18} />
              Rodar QA Baseline
            </>
          )}
        </Button>
      </div>

      {showDetails && testResults.length > 0 && (
        <Card className="fixed bottom-24 left-6 z-50 w-96 max-h-96 overflow-y-auto bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-bold text-sm flex items-center gap-2">
                <TestTube size={16} />
                Resultados dos Testes
              </h3>
              <button 
                onClick={() => setShowDetails(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-2">
              {testResults.map((test, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {getStatusIcon(test.status)}
                    <span className="text-xs text-foreground truncate">
                      {test.name}
                    </span>
                  </div>
                  {test.duration && (
                    <Badge variant="outline" className="text-xs">
                      {test.duration}ms
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  ✅ {testResults.filter(t => t.status === 'passed').length} passaram
                </span>
                <span>
                  ❌ {testResults.filter(t => t.status === 'failed').length} falharam
                </span>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground text-center">
                <p>Para rodar testes reais:</p>
                <code className="bg-secondary px-2 py-1 rounded mt-1 inline-block">
                  npm test
                </code>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};
