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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    if (isStandalone) return;

    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    if (isiOS) {
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
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-banner-dismissed', String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[60] p-3 md:p-4 animate-slide-up">
        <div className="max-w-lg mx-auto bg-zinc-900 border border-orange-500/50 rounded-2xl p-4 shadow-2xl shadow-orange-500/10">
          <div className="flex items-start gap-3">
            <img src="/logo.png" alt="Tecle Motos" className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Instalar Tecle Motos</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Acesse o sistema direto da tela inicial do seu celular, como um aplicativo.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-white p-1 flex-shrink-0"
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
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {isIOS ? 'Como instalar' : 'Instalar App'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Depois
            </button>
          </div>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-4">Instalar no iPhone/iPad</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="bg-orange-500/20 text-orange-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                <p className="text-sm text-gray-300">Toque no botao de <strong className="text-white">Compartilhar</strong> (icone de quadrado com seta para cima) na barra do Safari</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-orange-500/20 text-orange-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                <p className="text-sm text-gray-300">Role para baixo e toque em <strong className="text-white">"Adicionar a Tela de Inicio"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-orange-500/20 text-orange-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                <p className="text-sm text-gray-300">Confirme tocando em <strong className="text-white">"Adicionar"</strong></p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
