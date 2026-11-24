import { ScrollView, View, Text, Pressable } from 'react-native';
import { Target, Calendar, Zap, Swords, Shield, BarChart3, Trophy, Settings as Cog, type LucideIcon } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import { bigColor } from '../theme';
import { TopBar } from '../components/TopBar';
import { audio } from '../audio';

const MODES: { id: string; name: string; tg: string; color: string; icon: LucideIcon }[] = [
  { id: 'classic', name: 'Classique', tg: '100 niveaux · gate 3★', color: '#5B5BD6', icon: Target },
  { id: 'daily', name: 'Daily', tg: 'Un défi par jour', color: '#179C6B', icon: Calendar },
  { id: 'freeskill', name: 'Free Skill', tg: 'Chrono · adaptatif', color: '#E8A317', icon: Zap },
  { id: 'rogue', name: 'Rogue-like', tg: '3 vies · draft', color: '#E5484D', icon: Swords },
];

function ModeCard({ name, tg, color, icon: Icon, onPress }: { name: string; tg: string; color: string; icon: LucideIcon; onPress: () => void }) {
  return (
    <Pressable onPress={() => { void audio.play('select'); onPress(); }} className="flex-1 bg-card border border-line rounded-mode p-[14px] min-h-[104px] active:opacity-80">
      <View className="w-[38px] h-[38px] rounded-[11px] mb-[8px] items-center justify-center" style={{ backgroundColor: color }}>
        <Icon size={20} color="#FFFFFF" />
      </View>
      <Text className="font-semibold text-[15px]">{name}</Text>
      <Text className="text-mut text-[12px]">{tg}</Text>
    </Pressable>
  );
}

function FlatBtn({ label, icon: Icon, color, onPress }: { label: string; icon: LucideIcon; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { void audio.play('select'); onPress(); }} className="flex-1 bg-card border border-line rounded-mode p-[14px] flex-row items-center gap-[10px] active:opacity-80">
      <View className="w-[30px] h-[30px] rounded-[9px] items-center justify-center" style={{ backgroundColor: color }}><Icon size={17} color="#FFFFFF" /></View>
      <Text className="font-semibold">{label}</Text>
    </Pressable>
  );
}

export function Home({ navigation }: NativeStackScreenProps<RootStack, 'Home'>) {
  const go = (mode: string) => navigation.navigate('Play', { mode });
  return (
    <View className="flex-1 bg-bg">
      <TopBar />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View>
          <Text className="font-bold text-[22px]">Écris-le le plus court</Text>
          <Text className="text-mut text-[13.5px] mt-[2px]">Atteins la cible avec 3, 5, 7 et +, −, ×. Le plus court gagne.</Text>
        </View>
        <View className="flex-row gap-[12px]">{MODES.slice(0, 2).map((m) => <ModeCard key={m.id} {...m} onPress={() => go(m.id)} />)}</View>
        <View className="flex-row gap-[12px]">{MODES.slice(2).map((m) => <ModeCard key={m.id} {...m} onPress={() => go(m.id)} />)}</View>
        <Text className="font-semibold text-[13.5px]">Big Challenge</Text>
        <View className="flex-row gap-[12px]">
          {[3, 5, 7].map((x) => <ModeCard key={x} name={`Big ${x}`} tg={`Contient un ${x}`} color={bigColor[x]} icon={Shield} onPress={() => go(`big${x}`)} />)}
        </View>
        <View className="flex-row gap-[12px]">
          <FlatBtn label="Statistiques" icon={BarChart3} color="#179C6B" onPress={() => navigation.navigate('Stats')} />
          <FlatBtn label="Leaderboard" icon={Trophy} color="#E8A317" onPress={() => navigation.navigate('Leaderboard')} />
        </View>
        <FlatBtn label="Settings" icon={Cog} color="#5A6B7B" onPress={() => navigation.navigate('Settings')} />
      </ScrollView>
    </View>
  );
}
