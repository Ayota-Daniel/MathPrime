import { useState } from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ChevronDown, LockKeyhole, Star } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  colors,
  featuredInfo,
  featuredModes,
  levelNumbers,
  modeNames,
  rogue,
  type FeaturedMode,
} from '@shortest/tokens';
import type { RootStack } from '../../App';
import { TopBar } from '../components/TopBar';
import { GameText as Text, g } from '../components/GameScreen';
import { Button } from '../components/ui';
import { useGame } from '../store';

export function Home({
  navigation,
}: NativeStackScreenProps<RootStack, 'Home'>) {
  const [tab, setTab] = useState<FeaturedMode>('classic');
  const [more, setMore] = useState(false);
  const level = useGame((s) => s.classicProgress + 1);
  const stars = useGame((s) =>
    Object.values(s.classicStars).reduce((sum, n) => sum + n, 0),
  );
  const info = featuredInfo(tab, level);
  return (
    <>
      <TopBar />
      <ScrollView contentContainerStyle={g.wrap}>
        <View style={g.between}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Ton prochain{'\n'}déclic t’attend.</Text>
            <Text>Le plaisir de trouver.</Text>
          </View>
          <Image
            source={require('../../../../packages/tokens/assets/math-tiles.png')}
            accessible={false}
            resizeMode="contain"
            style={{ width: '34%', height: 110 }}
          />
        </View>
        <View style={styles.tabs}>
          {featuredModes.map((mode) => (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === mode }}
              onPress={() => setTab(mode)}
              style={[styles.tab, tab === mode && { borderColor: colors.pri }]}
            >
              <Text style={{ fontFamily: rogue.font.display, fontSize: 19 }}>
                {modeNames[mode]}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={g.blue}>
          <Text style={[g.light, { textTransform: 'uppercase', fontSize: 12 }]}>
            {info.eyebrow}
          </Text>
          <Text
            style={[g.light, { fontFamily: rogue.font.display, fontSize: 33 }]}
          >
            {modeNames[tab]}
          </Text>
          <Text style={g.light}>{info.detail}</Text>
          {tab === 'classic' && (
            <>
              <View style={g.row}>
                <Star size={16} color={colors.accent} fill={colors.accent} />
                <Text style={g.light}>{stars} étoiles</Text>
              </View>
              <View style={styles.trail}>
                {levelNumbers(Math.max(1, Math.min(level - 2, 96)), 5).map(
                  (n) => (
                    <View
                      key={n}
                      style={[
                        styles.step,
                        n > level && { backgroundColor: colors.op },
                        n === level && { borderColor: colors.pri },
                      ]}
                    >
                      <Text style={{ fontFamily: rogue.font.display }}>
                        {n}
                      </Text>
                      {n > level && (
                        <LockKeyhole size={12} color={colors.ink} />
                      )}
                    </View>
                  ),
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                style={{ alignSelf: 'center', padding: 10 }}
                onPress={() => navigation.navigate('Levels')}
              >
                <Text style={[g.light, { textDecorationLine: 'underline' }]}>
                  Voir les niveaux
                </Text>
              </Pressable>
            </>
          )}
        </View>
        <Button
          variant="primary"
          label={info.action}
          onPress={() =>
            tab === 'rogue'
              ? navigation.navigate('Rogue')
              : navigation.navigate('Play', { mode: tab })
          }
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: more }}
          onPress={() => setMore(!more)}
          style={[g.between, styles.more]}
        >
          <View>
            <Text style={styles.section}>Tous les modes</Text>
            <Text>Big Challenge et Free Skill</Text>
          </View>
          <ChevronDown color={colors.ink} size={19} />
        </Pressable>
        {more && (
          <>
            <Button
              label="Big Challenge"
              onPress={() => navigation.navigate('BigChallenge')}
            />
            <Button
              label="Free Skill"
              onPress={() => navigation.navigate('Play', { mode: 'freeskill' })}
            />
          </>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Help')}
          style={{ padding: 12, alignItems: 'center' }}
        >
          <Text style={{ textDecorationLine: 'underline' }}>
            Comment jouer ?
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
const styles = StyleSheet.create({
  title: {
    fontFamily: rogue.font.display,
    fontSize: 31,
    lineHeight: 34,
    color: colors.ink,
  },
  tabs: { flexDirection: 'row', justifyContent: 'space-around' },
  tab: {
    borderBottomWidth: 4,
    borderColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  trail: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 7,
  },
  step: {
    flex: 1,
    maxWidth: 54,
    height: 45,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.num,
  },
  section: { fontFamily: rogue.font.display, fontSize: 19 },
  more: {
    paddingVertical: 12,
    borderColor: colors.line,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
});
