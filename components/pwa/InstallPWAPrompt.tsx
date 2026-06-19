import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'proagenda-pwa-dismissed';

// Only renders on web. On native, returns null immediately.
export function InstallPWAPrompt() {
  if (Platform.OS !== 'web') return null;
  return <InstallBanner />;
}

function InstallBanner() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const [showBanner, setShowBanner] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already running as installed PWA — nothing to show
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    if (isStandalone) return;

    // User already dismissed the banner
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;

    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);

    if (ios) {
      // iOS only supports installation from Safari
      if (isSafari) {
        setIsIOS(true);
        setShowBanner(true);
      }
    } else {
      // Android / Desktop Chrome / Edge: intercept native install prompt
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e as BeforeInstallPromptEvent;
        setShowBanner(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  function dismiss() {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }

  async function handleInstall() {
    if (isIOS) {
      setShowGuide(true);
    } else if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      if (outcome === 'accepted') setShowBanner(false);
    }
  }

  if (!showBanner) return null;

  return (
    <>
      {/* ── Install banner ── */}
      <View style={[s.banner, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={[s.iconWrap, { backgroundColor: c.accentLight }]}>
          <Text style={{ fontSize: 18 }}>📱</Text>
        </View>
        <View style={s.bannerText}>
          <Text style={[s.bannerTitle, { color: c.text }]}>Instalá ProAgenda</Text>
          <Text style={[s.bannerSub, { color: c.muted }]}>
            Accedé desde tu pantalla de inicio
          </Text>
        </View>
        <TouchableOpacity
          style={[s.installBtn, { backgroundColor: c.accent }]}
          onPress={handleInstall}
          activeOpacity={0.85}>
          <Text style={s.installBtnText}>INSTALAR</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={dismiss} style={s.closeBtn} hitSlop={8}>
          <Text style={[s.closeX, { color: c.muted }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── iOS step-by-step guide ── */}
      <Modal
        visible={showGuide}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGuide(false)}>
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setShowGuide(false)}
        />
        <View style={[s.sheet, { backgroundColor: c.card }]}>
          <View style={[s.handle, { backgroundColor: c.border }]} />

          <View style={s.sheetHeader}>
            <View style={[s.sheetIcon, { backgroundColor: c.accentLight }]}>
              <Text style={{ fontSize: 22 }}>📱</Text>
            </View>
            <Text style={[s.sheetTitle, { color: c.text }]}>INSTALACIÓN DE LA APLICACIÓN</Text>
            <TouchableOpacity onPress={() => setShowGuide(false)} hitSlop={8}>
              <Text style={[s.closeX, { color: c.muted, fontSize: 18 }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {[
            {
              n: '1',
              title: 'Tocá el botón Compartir',
              desc: 'En Safari, tocá el ícono ↑ en la barra inferior del navegador.',
            },
            {
              n: '2',
              title: 'Elegí "Añadir a inicio"',
              desc: 'Deslizá las opciones hasta encontrar "Añadir a pantalla de inicio".',
            },
            {
              n: '3',
              title: 'Confirmá con "Agregar"',
              desc: 'ProAgenda va a quedar como una app más en tu pantalla de inicio.',
            },
          ].map((step) => (
            <View key={step.n} style={[s.stepRow, { backgroundColor: c.background }]}>
              <View style={[s.stepNum, { backgroundColor: c.accent }]}>
                <Text style={s.stepNumText}>{step.n}</Text>
              </View>
              <View style={s.stepContent}>
                <Text style={[s.stepTitle, { color: c.text }]}>{step.title}</Text>
                <Text style={[s.stepDesc, { color: c.muted }]}>{step.desc}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[s.understoodBtn, { backgroundColor: c.accent }]}
            onPress={() => { setShowGuide(false); dismiss(); }}
            activeOpacity={0.85}>
            <Text style={s.understoodText}>ENTENDIDO</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  // Banner
  banner: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 13, fontWeight: '700' },
  bannerSub: { fontSize: 11, marginTop: 1 },
  installBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  installBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  closeBtn: { paddingLeft: 4 },
  closeX: { fontSize: 15, fontWeight: '700' },

  // iOS guide modal
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000055' },
  sheet: {
    position: 'absolute' as any,
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 16,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  stepDesc: { fontSize: 13, lineHeight: 18 },

  // Footer button
  understoodBtn: {
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  understoodText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
