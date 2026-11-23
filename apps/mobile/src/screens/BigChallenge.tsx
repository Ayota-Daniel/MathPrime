import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, bigModes, modeNames, type BigMode } from '@shortest/tokens';
import type { RootStack } from '../../App';
import { GameText as Text, g } from '../components/GameScreen';
import { Button } from '../components/ui';
import { Back } from './Guide';

export function BigChallenge({
  navigation,
}: NativeStackScreenProps<RootStack, 'BigChallenge'>) {
  const [mode, setMode] = useState<BigMode>('big3');
  return (
    <ScrollView contentContainerStyle={g.wrap}>
      <Back go={() => navigation.goBack()} />
      <Text style={g.title}>Big Challenge</Text>
      <Text className="font-bold text-[20px]">Choisis le chiffre imposé</Text>
      <View style={g.row}>
        {bigModes.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={modeNames[key]}
            accessibilityState={{ selected: key === mode }}
            onPress={() => setMode(key)}
            style={{
              flex: 1,
              alignItems: 'center',
              padding: 12,
              borderRadius: 14,
              backgroundColor: key === mode ? colors.panel : colors.num,
            }}
          >
            <Text style={key === mode ? g.light : undefined}>
              {modeNames[key]}
            </Text>
            <Text style={[{ fontSize: 31 }, key === mode && g.light]}>
              {key.slice(-1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={g.blue}>
        <Text style={[g.light, { fontSize: 26 }]}>{modeNames[mode]}</Text>
        <Text style={g.light}>
          Ta solution doit contenir au moins un {mode.slice(-1)}.
        </Text>
        <Text style={g.light}>Tu peux aussi utiliser les autres chiffres.</Text>
      </View>
      <View style={g.strip}>
        <Text style={{ textAlign: 'center' }}>
          Sans parenthèses · La multiplication est prioritaire
        </Text>
      </View>
      <Button
        label={`Jouer à ${modeNames[mode]}`}
        variant="primary"
        onPress={() => navigation.navigate('Play', { mode })}
      />
      <Button
        label="Voir mes records"
        onPress={() => navigation.navigate('Stats')}
      />
    </ScrollView>
  );
}
