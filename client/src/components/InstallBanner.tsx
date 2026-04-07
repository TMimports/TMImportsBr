import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Já instalado como PWA — nunca mostrar
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    if (isStandalone) return;

    // Dispensado nesta sessão — não mostrar novamente até fechar e reabrir o browser
    const dismissedThisSession = sessionStorage.getItem('pwa-banner-dismissed');
    if (dismissedThisSession) return;

    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    if (isiOS) {
      // No iOS sempre pode mostrar (não tem evento beforeinstallprompt)
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowBanner(false);
      sessionStorage.setItem('pwa-banner-dismissed', '1');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    // Dispensa só para esta sessão — na próxima vez que abrir o navegador o banner volta
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[60] p-3 md:p-4 animate-slide-up">
        <div className="max-w-lg mx-auto bg-zinc-900 border border-orange-500/50 rounded-2xl p-4 shadow-2xl shadow-orange-500/10">
          <div className="flex items-start gap-3">
            <img src="/logo.png" alt="Tecle Motos" className="w-12 h-12 rounded-xl flex-shrink-0 object-contain" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">📲 Instalar Tecle Motos</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Acesse o sistema direto da tela inicial do seu celular, como um aplicativo nativo.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-zinc-500 hover:text-white p-1 flex-shrink-0 rounded-lg hover:bg-zinc-800"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {isIOS ? 'Como instalar no iPhone' : '📲 Instalar App'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 text-zinc-400 hover:text-white text-sm transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-5">
              <span className="text-4xl">📱</span>
              <h3 className="text-lg font-bold text-white mt-2">Instalar no iPhone / iPad</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="bg-orange-500/20 text-orange-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                <p className="text-sm text-zinc-300">
                  Toque no ícone de <strong className="text-white">Compartilhar</strong> (quadrado com seta ↑) na barra inferior do Safari
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-orange-500/20 text-orange-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                <p className="text-sm text-zinc-300">
                  Role a lista e toque em <strong className="text-white">"Adicionar à Tela de Início"</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-orange-500/20 text-orange-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                <p className="text-sm text-zinc-300">
                  Confirme tocando em <strong className="text-white">"Adicionar"</strong> no canto superior direito
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
