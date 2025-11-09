import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, QrCode, Key, CheckCircle2, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WhatsAppDialog = ({ open, onOpenChange }: WhatsAppDialogProps) => {
  const { user } = useAuth();
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;

    const setupConnection = async () => {
      await checkConnection();

      if (!user) return;

      const channel = supabase
        .channel('whatsapp_connections_changes')
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
              
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log('[Polling] Stopped after realtime event');
              }
              
              toast.success('WhatsApp conectado!', {
                description: `Número ${newRecord.phone_number} ativo`
              });
            } else if (payload.eventType === 'DELETE' || !newRecord?.is_active) {
              setIsConnected(false);
              setPhoneNumber(null);
              toast.info('WhatsApp desconectado');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupConnection();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user, open]);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

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
    const maxAttempts = 40;

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
      
      startPolling();
    } catch (error) {
      toast.error('Erro ao gerar QR Code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
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
      toast.success('Desconectado com sucesso');
    } catch (error) {
      toast.error('Erro ao desconectar');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-test');
      
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
      toast.error('Erro ao enviar', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingConnection) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                WhatsApp Conectado
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" />
                Conectar WhatsApp
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isConnected ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Conexão Ativa
                </CardTitle>
                <CardDescription>
                  Número conectado: {phoneNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    ℹ️ Sua conexão está ativa. Você pode receber notificações e enviar mensagens.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={sendTestMessage}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Mensagem de Teste'
                    )}
                  </Button>
                  
                  <Button 
                    onClick={disconnect}
                    variant="destructive"
                    disabled={loading}
                  >
                    Desconectar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Tabs defaultValue="code" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Código
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conectar via Código</CardTitle>
                  <CardDescription>
                    Use um código de ativação único
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!activationCode ? (
                    <Button 
                      onClick={generateCode}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        'Gerar Código'
                      )}
                    </Button>
                  ) : (
                    <>
                      <div className="p-6 bg-muted rounded-lg text-center">
                        <p className="text-3xl font-mono font-bold tracking-wider">
                          {activationCode}
                        </p>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>📱 <strong>Passo 1:</strong> Abra o WhatsApp no seu celular</p>
                        <p>⚙️ <strong>Passo 2:</strong> Vá em Configurações → Aparelhos conectados</p>
                        <p>🔗 <strong>Passo 3:</strong> Toque em "Conectar um aparelho"</p>
                        <p>🔢 <strong>Passo 4:</strong> Digite o código acima</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conectar via QR Code</CardTitle>
                  <CardDescription>
                    Escaneie com seu WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!qrCodeUrl ? (
                    <Button 
                      onClick={generateQRCode}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        'Gerar QR Code'
                      )}
                    </Button>
                  ) : (
                    <>
                      <div className="flex justify-center p-4 bg-white rounded-lg">
                        <QRCodeSVG value={qrCodeUrl} size={256} />
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>📱 <strong>Passo 1:</strong> Abra o WhatsApp no seu celular</p>
                        <p>⚙️ <strong>Passo 2:</strong> Vá em Configurações → Aparelhos conectados</p>
                        <p>🔗 <strong>Passo 3:</strong> Toque em "Conectar um aparelho"</p>
                        <p>📷 <strong>Passo 4:</strong> Aponte a câmera para o QR Code acima</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
