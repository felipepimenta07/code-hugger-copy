import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { MessageCircle, Check, Copy, Loader2 } from 'lucide-react';

export default function WhatsAppIntegration() {
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        setIsConnected(true);
        setPhoneNumber(data.phone_number);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setCheckingConnection(false);
    }
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
    } catch (error) {
      toast.error('Erro ao gerar QR Code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('whatsapp_connections')
      .update({ is_active: false })
      .eq('user_id', user.id);

    setIsConnected(false);
    setPhoneNumber(null);
    toast.success('WhatsApp desconectado');
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

                <Button variant="destructive" onClick={disconnect}>
                  Desconectar WhatsApp
                </Button>
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
                        <li>Salve o número da Network Matrix no seu WhatsApp</li>
                        <li>Envie: <strong>CONECTAR {activationCode}</strong></li>
                        <li>Aguarde a confirmação!</li>
                      </ol>
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
                        <li>Aponte a câmera do WhatsApp para o QR Code</li>
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
