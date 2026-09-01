// components/AppErrorBoundary.tsx
// The outermost node in the tree. Without it, one bad render anywhere — a modal
// reading a field the server did not send, a store whose persisted shape moved —
// takes the entire app down to the launcher on a release build.
//
// It sits OUTSIDE the providers deliberately, so it also catches a crash inside
// LanguageProvider / ThemeProvider / RevenueCatProvider. That is why nothing here
// calls useTheme() or useLanguage(): the fallback has to render with no context
// available at all, so its colours and its copy are local and English-only.

import * as Updates from 'expo-updates';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import {
  CrashInfo,
  getLastCrash,
  installGlobalErrorHandler,
  reportCrash,
  subscribeToCrash,
} from '../utils/crashReporter';

const BG = '#0D0A07';
const CARD = '#141210';
const BORDER = '#251E16';
const GOLD = '#E8B84D';
const TEXT = '#F5EFE6';
const SUBTEXT = '#9B9088';
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

interface State { crash: CrashInfo | null; showDetails: boolean }

export default class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  private unsubscribe?: () => void;

  state: State = { crash: null, showDetails: false };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    // Installed in the constructor rather than componentDidMount: a crash during
    // the very first render of the tree below would otherwise beat the effect.
    installGlobalErrorHandler();
  }

  static getDerivedStateFromError(error: any): Partial<State> {
    return {
      crash: {
        message: String(error?.message ?? error ?? 'Unknown error'),
        stack: String(error?.stack ?? ''),
        source: 'render',
        at: Date.now(),
      },
    };
  }

  componentDidMount() {
    // A fatal thrown from a timer or a promise never reaches componentDidCatch,
    // so the global handler routes it here instead.
    this.unsubscribe = subscribeToCrash(crash => {
      if (!this.state.crash) this.setState({ crash });
    });
    const existing = getLastCrash();
    if (existing && !this.state.crash) this.setState({ crash: existing });
  }

  componentWillUnmount() { this.unsubscribe?.(); }

  componentDidCatch(error: any, errorInfo: { componentStack?: string }) {
    reportCrash(error, 'render', {
      component_stack: (errorInfo?.componentStack ?? '').split('\n').slice(0, 10).join('\n'),
    });
  }

  private reload = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // reloadAsync throws in a dev client and when updates are disabled. Clearing
      // the boundary is the next best thing — the tree remounts from scratch.
      this.setState({ crash: null, showDetails: false });
    }
  };

  render() {
    const { crash, showDetails } = this.state;
    if (!crash) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: BG, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: TEXT, fontSize: 22, fontWeight: '900', fontFamily: SERIF, marginBottom: 10 }}>
          Something went wrong
        </Text>
        <Text style={{ color: SUBTEXT, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
          Daily History hit an unexpected error. Reloading usually fixes it — your
          streak, saved stories and subscription are untouched.
        </Text>

        <Pressable
          onPress={this.reload}
          style={{ backgroundColor: GOLD, paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#1A1206', fontSize: 15, fontWeight: '800' }}>Reload</Text>
        </Pressable>

        <Pressable onPress={() => this.setState({ showDetails: !showDetails })} style={{ marginTop: 20 }}>
          <Text style={{ color: SUBTEXT, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
            {showDetails ? 'Hide technical details' : 'Technical details'}
          </Text>
        </Pressable>

        {showDetails && (
          <ScrollView
            style={{
              marginTop: 12, maxHeight: 260, backgroundColor: CARD,
              borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 12,
            }}
          >
            <Text selectable style={{ color: GOLD, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
              {crash.source === 'render' ? 'render' : 'global'} · {crash.message}
            </Text>
            <Text selectable style={{ color: SUBTEXT, fontSize: 10, lineHeight: 15 }}>
              {crash.stack || '(no stack)'}
            </Text>
            {/* Which bundle produced this. Without it a screenshot cannot be told
                apart from one taken on the build's embedded JS. */}
            <Text selectable style={{ color: SUBTEXT, fontSize: 10, marginTop: 10, opacity: 0.7 }}>
              {'bundle: ' + (Updates.isEmbeddedLaunch ? 'embedded' : (Updates.updateId ?? 'unknown'))}
            </Text>
          </ScrollView>
        )}
      </View>
    );
  }
}
