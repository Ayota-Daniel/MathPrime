import { Pressable, View } from 'react-native';
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Settings,
  Trophy,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import { colors, rogue } from '@shortest/tokens';
import { GameText } from './GameScreen';

const links = [
  { screen: 'Stats', name: 'Statistiques', Icon: ChartNoAxesColumnIncreasing },
  { screen: 'Leaderboard', name: 'Classement', Icon: Trophy },
  { screen: 'Help', name: 'Comment jouer', Icon: BookOpen },
  { screen: 'Settings', name: 'Paramètres', Icon: Settings },
] as const;
export function TopBar() {
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: colors.line,
      }}
    >
      <GameText
        accessibilityRole="header"
        style={{ fontFamily: rogue.font.display, fontSize: 22 }}
      >
        MathPrime
      </GameText>
      <View style={{ flexDirection: 'row' }}>
        {links.map(({ screen, name, Icon }) => (
          <Pressable
            key={screen}
            accessibilityRole="button"
            accessibilityLabel={name}
            style={{
              width: 40,
              minHeight: 46,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => nav.navigate(screen)}
          >
            <Icon size={19} color={colors.ink} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
