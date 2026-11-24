/** Big Challenge : choisir le chiffre imposé avant de jouer. */
import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { bigModes, type BigMode } from '@shortest/tokens';
import type { RootStack } from '../../App';
import { useGame } from '../store';
import { C, num, fmt, Screen, PressSheet, Button, BackButton, Text } from '../components/ui';

export function BigChallenge({ navigation }: NativeStackScreenProps<RootStack, 'BigChallenge'>) {
  const [mode, setMode] = useState<BigMode>('big3');
  const best = useGame((s) => s.bestByMode);
  const digit = mode.slice(-1);
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14 }}>
        <BackButton label="Retour" onPress={() => navigation.goBack()} />
        <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '900', color: C.ink }}>Big Challenge</Text>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 }}>
        <Text accessibilityRole="header" style={{ marginTop: 16, marginBottom: 10, fontSize: 16, fontWeight: '800', color: C.graphite }}>Choisis le chiffre imposé</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Chiffre obligatoire" style={{ flexDirection: 'row', gap: 12 }}>
          {bigModes.map((key) => {
            const on = key === mode; const rec = best[key] ?? 0;
            return (
              <PressSheet key={key} label={`Chiffre ${key.slice(-1)}`} style={{ flex: 1 }} onPress={() => setMode(key)}
                shadow={on ? C.pen : C.graphite} border={on ? C.pen : C.graphite}
                inner={{ minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Text style={[num, { fontSize: 38, fontWeight: '900', color: on ? C.pen : C.graphite }]}>{key.slice(-1)}</Text>
                <Text style={{ color: C.mine, fontSize: 12 }}>{rec > 0 ? `record ${fmt(rec)}` : 'pas encore joué'}</Text>
              </PressSheet>
            );
          })}
        </View>
        <View style={{ alignSelf: 'center', marginTop: 24, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2.5, borderColor: C.pen, borderRadius: 6, transform: [{ rotate: '-2.5deg' }] }}>
          <Text style={{ color: C.pen, fontSize: 18, fontWeight: '800' }}>Doit contenir un {digit}</Text>
        </View>
        <Text style={{ marginTop: 20, fontSize: 15, lineHeight: 22, color: C.graphite }}>
          Ta solution doit utiliser au moins un {digit}. Les autres chiffres restent permis. Sans parenthèses : × se calcule avant + et −. Les points comptent ×1,25.
        </Text>
        <View style={{ marginTop: 'auto', paddingTop: 24, gap: 12 }}>
          <Button variant="ink" label={`Jouer avec le ${digit}`} onPress={() => navigation.navigate('Play', { mode })} />
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Stats')} style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ color: C.ink, fontSize: 15, fontWeight: '700' }}>Voir mes records</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
