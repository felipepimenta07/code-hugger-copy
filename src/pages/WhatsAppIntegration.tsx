import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { MessageCircle, Check, Copy, Loader2 } from 'lucide-react';

export default function WhatsAppIntegration() {
  const WHATSAPP_NUMBER = '+1 555 152 9965';
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const setupConnection = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      checkConnection();

      // Real-time listener for connection status
      const channel = supabase
        .channel('whatsapp_connection_status')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_connections',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[Realtime] Connection event received:', payload.eventType, payload);
            const newRecord = payload.new as any;
            if (newRecord?.is_active) {
              console.log('[Realtime] Connection activated:', newRecord.phone_number);
              setIsConnected(true);
              setPhoneNumber(newRecord.phone_number);
              
              // Stop polling if active
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log('[Polling] Stopped after realtime event');
              }
              
              toast.success('WhatsApp conectado!', {
                description: `Número ${newRecord.phone_number} ativo`
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        setIsConnected(true);
        setPhoneNumber(data.phone_number);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    } finally {
      setCheckingConnection(false);
    }
  };

  const startPolling = () => {
    console.log('[Polling] Starting fallback polling (3s interval, 2min max)');
    let attempts = 0;
    const maxAttempts = 40; // 40 * 3s = 2 minutes

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      console.log(`[Polling] Attempt ${attempts}/${maxAttempts}`);
      
      const connected = await checkConnection();
      
      if (connected || attempts >= maxAttempts) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          console.log(`[Polling] Stopped - ${connected ? 'Connected!' : 'Max attempts reached'}`);
        }
      }
    }, 3000);
  };

  const generateCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-activate', {
        body: { method: 'code' }
      });

      if (error) throw error;
      setActivationCode(data.code);
      toast.success('Código gerado com sucesso!');
      
      // Start polling as fallback
      startPolling();
    } catch (error) {
      toast.error('Erro ao gerar código');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-activate', {
        body: { method: 'qrcode' }
      });

      if (error) throw error;
      setQrCodeUrl(data.qrUrl);
      toast.success('QR Code gerado!');
      
      // Start polling as fallback
      startPolling();
    } catch (error) {
      toast.error('Erro ao gerar QR Code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('whatsapp_connections')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setPhoneNumber(null);
      toast.success('WhatsApp desconectado com sucesso');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Erro ao desconectar');
    }
  };

  const sendTestMessage = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('whatsapp-test', {
        body: { message: 'Teste de conexão - Network Matrix' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Mensagem enviada!', {
          description: 'Verifique seu WhatsApp'
        });
      } else {
        const errorMsg = data.error?.message || 'Erro desconhecido';
        const isCountryRestriction = errorMsg.includes('country') || errorMsg.includes('restricted');
        
        toast.error('Falha no envio', {
          description: isCountryRestriction 
            ? 'Restrição de país - mas sua conexão está ativa!' 
            : errorMsg,
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('Test message error:', error);
      toast.error('Erro ao enviar mensagem de teste', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingConnection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="text-green-600" />
                WhatsApp Conectado
              </CardTitle>
              <CardDescription>
                Número conectado: {phoneNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <Check size={24} />
                  <span className="font-medium">Status: Ativo</span>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Como usar:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Abra o WhatsApp</li>
                    <li>Escolha um contato e clique em "Compartilhar"</li>
                    <li>Envie para o número da Matrix</li>
                    <li>Escolha criar nó ou flow</li>
                    <li>Pronto! Aparecerá automaticamente no app</li>
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={sendTestMessage}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Teste'
                    )}
                  </Button>
                  <Button 
                    onClick={disconnect}
                    variant="destructive"
                  >
                    Desconectar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle />
              Conectar WhatsApp
            </CardTitle>
            <CardDescription>
              Escolha como deseja conectar seu WhatsApp ao Network Matrix
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code">Código</TabsTrigger>
                <TabsTrigger value="qrcode">QR Code</TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="space-y-4">
                {!activationCode ? (
                  <Button onClick={generateCode} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Gerar Código de Ativação
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-primary/10 p-6 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-2">Seu código:</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-4xl font-mono font-bold">{activationCode}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(activationCode);
                            toast.success('Código copiado!');
                          }}
                        >
                          <Copy size={16} />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Expira em 5 minutos</p>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Passos:</h3>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>
                          Salve o número da Network Matrix no seu WhatsApp:
                          <div className="flex items-center gap-2 mt-1.5 ml-4">
                            <code className="bg-background px-3 py-1 rounded text-base font-mono font-semibold">
                              {WHATSAPP_NUMBER}
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                navigator.clipboard.writeText(WHATSAPP_NUMBER);
                                toast.success('Número copiado!');
                              }}
                            >
                      <Copy size={14} />
                    </Button>
                  </div>
                </li>
                <li className="mt-2">Envie: <strong>CONECTAR {activationCode}</strong></li>
                <li>Aguarde a confirmação!</li>
              </ol>
            </div>

            <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">
                ⏳ Aguardando mensagem CONECTAR...
              </p>
              <p className="text-xs text-muted-foreground">
                A conexão será ativada automaticamente quando você enviar a mensagem
              </p>
            </div>
          </div>
        )}
              </TabsContent>

              <TabsContent value="qrcode" className="space-y-4">
                {!qrCodeUrl ? (
                  <Button onClick={generateQRCode} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Gerar QR Code
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-primary/10 p-6 rounded-lg text-center">
                      <QRCodeSVG value={qrCodeUrl} size={200} className="mx-auto" />
                      <p className="text-xs text-muted-foreground mt-4">Expira em 5 minutos</p>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Passos:</h3>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>
                          Salve o número da Network Matrix no seu WhatsApp:
                          <div className="flex items-center gap-2 mt-1.5 ml-4">
                            <code className="bg-background px-3 py-1 rounded text-base font-mono font-semibold">
                              {WHATSAPP_NUMBER}
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                navigator.clipboard.writeText(WHATSAPP_NUMBER);
                                toast.success('Número copiado!');
                              }}
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </li>
                        <li className="mt-2">Aponte a câmera do WhatsApp para o QR Code</li>
                        <li>Ou clique no link que abrir</li>
                        <li>Envie a mensagem de conexão</li>
                        <li>Aguarde a confirmação!</li>
                      </ol>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
