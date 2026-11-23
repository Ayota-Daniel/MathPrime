import { GameText as Text, g } from '../components/GameScreen';
import { Alert, View, Pressable, ScrollView, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import { useGame } from '../store';

function Toggle({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      className="w-[46px] h-[28px] rounded-full justify-center"
      style={{ backgroundColor: on ? '#12346C' : '#BBA4AD' }}
    >
      <View
        className="w-[22px] h-[22px] rounded-full bg-white"
        style={{ marginLeft: on ? 21 : 3 }}
      />
    </Pressable>
  );
}
const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View className="flex-row items-center justify-between py-[14px] border-b border-line">
    <Text>{label}</Text>
    {children}
  </View>
);

export function Settings({
  navigation,
}: NativeStackScreenProps<RootStack, 'Settings'>) {
  const s = useGame((st) => st.settings);
  const set = useGame((st) => st.setSetting);
  const reset = useGame((st) => st.resetProgress);
  const pseudo = useGame((st) => st.pseudo);
  const setPseudo = useGame((st) => st.setPseudo);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={g.wrap}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text className="text-mut font-semibold">‹ Retour</Text>
      </Pressable>
      <Text style={g.title}>Paramètres</Text>
      <View className="bg-card border border-line rounded-card px-[16px]">
        <Text className="font-bold mt-3 text-[18px]">Ambiance</Text>
        <Row label="Sons (bruitages)">
          <Toggle
            label="Sons (bruitages)"
            on={s.sound}
            onPress={() => set('sound', !s.sound)}
          />
        </Row>
        <Row label="Musique de fond">
          <Toggle
            label="Musique de fond"
            on={s.music}
            onPress={() => set('music', !s.music)}
          />
        </Row>
        <Text className="font-bold mt-3 text-[18px]">Accessibilité</Text>
        <Row label="Réduire les animations">
          <Toggle
            label="Réduire les animations"
            on={s.reduceMotion}
            onPress={() => set('reduceMotion', !s.reduceMotion)}
          />
        </Row>
        <Text className="font-bold mt-3 text-[18px]">Profil et partage</Text>
        <Row label="Participer au Daily compétitif">
          <Toggle
            label="Participer au Daily compétitif"
            on={s.leaderboardOptIn}
            onPress={() => set('leaderboardOptIn', !s.leaderboardOptIn)}
          />
        </Row>
        <Row label="Pseudo">
          <TextInput
            accessibilityLabel="Pseudo"
            value={pseudo}
            onChangeText={setPseudo}
            maxLength={16}
            placeholder="anon"
            className="border border-line rounded-[8px] px-[10px] py-[6px] w-[140px] text-right"
          />
        </Row>
        <Row label="Réinitialiser">
          <Pressable
            onPress={() =>
              Alert.alert('Effacer ta progression locale ?', undefined, [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Effacer', style: 'destructive', onPress: reset },
              ])
            }
          >
            <Text className="text-err font-semibold">Effacer</Text>
          </Pressable>
        </Row>
      </View>
    </ScrollView>
  );
}
