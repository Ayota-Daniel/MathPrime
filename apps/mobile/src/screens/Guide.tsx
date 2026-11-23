import { useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { ChevronLeft, LockKeyhole } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, levelNumbers, rogue } from '@shortest/tokens';
import { GameText as Text, g } from '../components/GameScreen';
import { Button } from '../components/ui';
import { useGame } from '../store';
import type { RootStack } from '../../App';

export function Back({
  label = 'Accueil',
  go,
}: {
  label?: string;
  go: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={go} style={g.back}>
      <ChevronLeft size={20} color={colors.ink} />
      <Text>{label}</Text>
    </Pressable>
  );
}
export function Levels({
  navigation,
}: NativeStackScreenProps<RootStack, 'Levels'>) {
  const current = useGame((s) => s.classicProgress + 1);
  const stars = useGame((s) => s.classicStars);
  const [page, setPage] = useState(Math.floor((current - 1) / 15));
  const first = page * 15 + 1;
  return (
    <ScrollView contentContainerStyle={g.wrap}>
      <Back go={() => navigation.goBack()} />
      <Text style={g.title}>Classic</Text>
      <Text style={g.sub}>Choisis ton niveau</Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          gap: 6,
        }}
      >
        {levelNumbers(first, 15).map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`Niveau ${n}`}
            accessibilityState={{ disabled: n > current }}
            disabled={n > current}
            onPress={() =>
              navigation.navigate('Play', { mode: 'classic', niveau: n })
            }
            style={[
              styles.level,
              n > current && { backgroundColor: colors.op },
              n === current && { borderColor: colors.pri },
            ]}
          >
            <Text style={{ fontSize: 20, fontFamily: rogue.font.display }}>
              {n}
            </Text>
            {n > current ? (
              <LockKeyhole size={13} color={colors.ink} />
            ) : (
              <Text>{stars[n - 1] ?? 0}/3 ★</Text>
            )}
          </Pressable>
        ))}
      </View>
      <View style={g.between}>
        <Button
          label="Précédent"
          disabled={!page}
          onPress={() => setPage(page - 1)}
        />
        <Text>
          {first}–{Math.min(first + 14, 100)}
        </Text>
        <Button
          label="Suivant"
          disabled={first + 15 > 100}
          onPress={() => setPage(page + 1)}
        />
      </View>
      <View style={g.blue}>
        <Text style={[g.light, { fontSize: 24 }]}>Niveau {current}</Text>
        <Text style={g.light}>
          Obtiens trois étoiles pour débloquer le niveau suivant.
        </Text>
      </View>
      <Button
        variant="primary"
        label={`Jouer au niveau ${current}`}
        onPress={() => navigation.navigate('Play', { mode: 'classic' })}
      />
    </ScrollView>
  );
}
export function Help({
  navigation,
}: NativeStackScreenProps<RootStack, 'Help'>) {
  return (
    <ScrollView contentContainerStyle={g.wrap}>
      <Back go={() => navigation.goBack()} />
      <Text style={g.title}>Comment jouer</Text>
      <View style={g.strip}>
        <Text
          style={[g.sub, { color: colors.ink, fontFamily: rogue.font.display }]}
        >
          Atteins la cible, fais court.
        </Text>
      </View>
      <View style={g.blue}>
        <Text style={[g.light, { textAlign: 'center' }]}>Cible</Text>
        <Text style={g.value}>8</Text>
      </View>
      <Text>
        Utilise 3, 5 et 7 avec +, − et ×. Tu peux réutiliser chaque chiffre. La
        multiplication est prioritaire.
      </Text>
      <Text style={styles.example}>3 × 5 − 7 = 8</Text>
      <Text style={styles.example}>3 + 5 = 8</Text>
      <Text>
        À résultat égal, le calcul le plus court gagne le plus d’étoiles.
      </Text>
      <Button
        variant="primary"
        label="C’est compris"
        onPress={() => navigation.goBack()}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  level: {
    width: '18%',
    minHeight: 54,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 10,
    backgroundColor: colors.num,
    alignItems: 'center',
    justifyContent: 'center',
  },
  example: {
    fontFamily: rogue.font.display,
    fontSize: 24,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderColor: colors.pri,
  },
});
