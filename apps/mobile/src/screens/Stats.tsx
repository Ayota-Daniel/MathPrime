import { ScrollView, View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, modeNames } from '@shortest/tokens';
import type { RootStack } from '../../App';
import { GameText as Text, g } from '../components/GameScreen';
import { useGame } from '../store';
import { Back } from './Guide';

const modes = [
  'classic',
  'daily',
  'freeskill',
  'rogue',
  'big3',
  'big5',
  'big7',
] as const;

export function Stats({
  navigation,
}: NativeStackScreenProps<RootStack, 'Stats'>) {
  const game = useGame();
  const stars = Object.values(game.classicStars).reduce(
    (sum, value) => sum + value,
    0,
  );
  const metrics = [
    ['XP', game.xp],
    ['Rang', game.rank()],
    ['Parties', game.stats.played],
    ['Parfaits', game.stats.perfect],
    [
      'Taux de parfaits',
      game.stats.played
        ? Math.round((100 * game.stats.perfect) / game.stats.played) + ' %'
        : '—',
    ],
  ];
  return (
    <ScrollView contentContainerStyle={g.wrap}>
      <Back go={() => navigation.goBack()} />
      <Text style={g.title}>Mes statistiques</Text>
      <View style={g.blue}>
        <Text style={[g.light, { fontSize: 25 }]}>Classic</Text>
        <View style={g.between}>
          <Text style={g.light}>Niveau {game.classicProgress + 1} / 100</Text>
          <Text style={[g.light, { color: colors.accent }]}>
            ★ {stars} / 300
          </Text>
        </View>
        <View
          style={{ height: 6, backgroundColor: '#536e98', borderRadius: 6 }}
        >
          <View
            style={{
              height: 6,
              width: `${stars / 3}%`,
              backgroundColor: colors.accent,
              borderRadius: 6,
            }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Levels')}
          style={{ alignSelf: 'center', padding: 10 }}
        >
          <Text style={[g.light, { textDecorationLine: 'underline' }]}>
            Voir les niveaux
          </Text>
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
        }}
      >
        {metrics.map(([label, value]) => (
          <View key={label} style={{ alignItems: 'center' }}>
            <Text className="font-bold">{value}</Text>
            <Text className="text-mut text-[12px]">{label}</Text>
          </View>
        ))}
      </View>
      <Text className="font-bold text-[19px]">Tes records</Text>
      {modes.map((mode) => (
        <View
          key={mode}
          style={[
            g.between,
            {
              borderBottomWidth: 1,
              borderColor: colors.line,
              paddingVertical: 7,
            },
          ]}
        >
          <Text className="font-bold">{modeNames[mode]}</Text>
          <View style={g.row}>
            <Text className="text-mut">
              Série {game.bestStreakByMode[mode] ?? 0}
            </Text>
            <Text className="font-bold">{game.bestByMode[mode] ?? 0} pts</Text>
          </View>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        style={{ padding: 12, alignItems: 'center' }}
        onPress={() => navigation.navigate('Leaderboard')}
      >
        <Text style={{ textDecorationLine: 'underline' }}>
          Voir le classement →
        </Text>
      </Pressable>
    </ScrollView>
  );
}
