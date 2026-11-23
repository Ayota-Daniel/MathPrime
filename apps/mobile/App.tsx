import { useEffect, Component, type ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { GameScreen, gameFonts } from './src/components/GameScreen';
import { Levels, Help } from './src/screens/Guide';
import { StatusBar } from 'expo-status-bar';
import { useGame } from './src/store';
import { audio } from './src/audio';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Rogue } from './src/screens/Rogue';
import { BigChallenge } from './src/screens/BigChallenge';
import { Home } from './src/screens/Home';
import { Play } from './src/screens/Play';
import { Settings } from './src/screens/Settings';
import { Stats } from './src/screens/Stats';
import { Leaderboard } from './src/screens/Leaderboard';
import './global.css';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: 80,
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#E5484D' }}>
            Crash JS attrapé
          </Text>
          <Text selectable style={{ marginTop: 12, fontFamily: 'monospace' }}>
            {String(this.state.error?.stack ?? this.state.error)}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children as ReactNode;
  }
}

export type RootStack = {
  Rogue: undefined;
  Home: undefined;
  Play: { mode: string; niveau?: number };
  BigChallenge: undefined;
  Levels: undefined;
  Help: undefined;
  Settings: undefined;
  Stats: undefined;
  Leaderboard: undefined;
};
const Stack = createNativeStackNavigator<RootStack>();

export default function App() {
  const [fontsLoaded, fontError] = useFonts(gameFonts);
  const hydrate = useGame((s) => s.hydrate);
  const hydrated = useGame((s) => s.hydrated);
  const sound = useGame((s) => s.settings.sound);
  const music = useGame((s) => s.settings.music);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(() => {
    audio.enabled = sound;
  }, [sound]);
  useEffect(() => {
    audio.musicEnabled = music;
    if (music) void audio.startMusic();
    else void audio.stopMusic();
  }, [music]);
  if (!hydrated || (!fontsLoaded && !fontError)) return null;
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            screenLayout={({ route, children }) =>
              route.name === 'Rogue' ? (
                children
              ) : (
                <GameScreen>{children}</GameScreen>
              )
            }
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FFF5EF' },
            }}
          >
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen
              name="Rogue"
              component={Rogue}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="BigChallenge" component={BigChallenge} />
            <Stack.Screen name="Help" component={Help} />
            <Stack.Screen name="Levels" component={Levels} />
            <Stack.Screen name="Play" component={Play} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="Stats" component={Stats} />
            <Stack.Screen name="Leaderboard" component={Leaderboard} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
