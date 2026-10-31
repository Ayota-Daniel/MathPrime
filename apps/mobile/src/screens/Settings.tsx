import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import { useGame } from '../store';

function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="w-[46px] h-[28px] rounded-full justify-center" style={{ backgroundColor: on ? '#179C6B' : '#CBD5E1' }}>
      <View className="w-[22px] h-[22px] rounded-full bg-white" style={{ marginLeft: on ? 21 : 3 }} />
    </Pressable>
  );
}
export function Settings({ navigation }: NativeStackScreenProps<RootStack, 'Settings'>) {
  const s = useGame((st) => st.settings); const set = useGame((st) => st.setSetting); const reset = useGame((st) => st.resetProgress);
  const pseudo = useGame((st) => st.pseudo); const setPseudo = useGame((st) => st.setPseudo);
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) =>
    <View className="flex-row items-center justify-between py-[14px] border-b border-line"><Text>{label}</Text>{children}</View>;
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 18, gap: 14 }}>
      <Pressable onPress={() => navigation.goBack()}><Text className="text-mut font-semibold">‹ Retour</Text></Pressable>
      <Text className="font-bold text-[22px]">Settings</Text>
      <View className="bg-card border border-line rounded-card px-[16px]">
        <Row label="Sons (bruitages)"><Toggle on={s.sound} onPress={() => set('sound', !s.sound)} /></Row>
        <Row label="Musique de fond"><Toggle on={s.music} onPress={() => set('music', !s.music)} /></Row>
        <Row label="Réduire les animations"><Toggle on={s.reduceMotion} onPress={() => set('reduceMotion', !s.reduceMotion)} /></Row>
        <Row label="Partager au leaderboard"><Toggle on={s.leaderboardOptIn} onPress={() => set('leaderboardOptIn', !s.leaderboardOptIn)} /></Row>
        <Row label="Pseudo"><TextInput value={pseudo} onChangeText={setPseudo} maxLength={16} placeholder="anon" className="border border-line rounded-[8px] px-[10px] py-[6px] w-[140px] text-right" /></Row>
        <Row label="Réinitialiser"><Pressable onPress={reset}><Text className="text-err font-semibold">Effacer</Text></Pressable></Row>
      </View>
    </ScrollView>
  );
}
