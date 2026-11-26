/** Barre d'onglets du bas : Jouer, Stats, Classement, Réglages. L'onglet actif est surligné. */
import { View, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutGrid, BarChart3, Trophy, SlidersHorizontal } from 'lucide-react-native';
import type { RootStack } from '../../App';
import { C, Text } from './ui';

const TABS = [
  { name: 'Home', label: 'Jouer', Icon: LayoutGrid },
  { name: 'Stats', label: 'Stats', Icon: BarChart3 },
  { name: 'Leaderboard', label: 'Classement', Icon: Trophy },
  { name: 'Settings', label: 'Réglages', Icon: SlidersHorizontal },
] as const;

export function TabBar() {
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const route = useRoute();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1.5, borderColor: C.graphite, backgroundColor: C.white }}>
      {TABS.map(({ name, label, Icon }) => {
        const active = route.name === name;
        const color = active ? C.ink : C.mine;
        return (
          <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label}
            onPress={() => { if (!active) nav.navigate(name); }}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingTop: 10, paddingBottom: 12 }}>
            <Icon size={22} strokeWidth={2} color={color} />
            <View>
              {active && <View style={{ position: 'absolute', left: -4, right: -4, top: '52%', bottom: '5%', backgroundColor: C.hl }} />}
              <Text style={{ fontSize: 12, fontWeight: '700', color }}>{label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
