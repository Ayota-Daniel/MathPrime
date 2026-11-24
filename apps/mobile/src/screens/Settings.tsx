import { useState, type ReactNode } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import { useGame } from '../store';
import { TabBar } from '../components/TabBar';
import { C, num, Screen, Sheet, Title, Button, Switch, Text } from '../components/ui';

function Group({ title, children }: { title: string; children: ReactNode | ReactNode[] }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View>
      <Text accessibilityRole="header" style={{ fontSize: 14, fontWeight: '800', color: C.mine, marginBottom: 8 }}>{title}</Text>
      <Sheet inner={{ paddingHorizontal: 16 }}>
        {items.map((c, i) => <View key={i} style={i > 0 ? { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash } : undefined}>{c}</View>)}
      </Sheet>
    </View>
  );
}
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52 }}>
    <Text style={{ fontSize: 15.5, color: C.graphite, flexShrink: 1 }}>{label}</Text>{children}
  </View>
);

export function Settings({ navigation }: NativeStackScreenProps<RootStack, 'Settings'>) {
  const s = useGame((st) => st.settings);
  const set = useGame((st) => st.setSetting);
  const reset = useGame((st) => st.resetProgress);
  const pseudo = useGame((st) => st.pseudo);
  const setPseudo = useGame((st) => st.setPseudo);
  const [confirm, setConfirm] = useState(false);

  return (
    <Screen bottomInset={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 18 }}>
        <Title>Réglages</Title>
        <Group title="Son et affichage">
          <Row label="Bruitages"><Switch label="Bruitages" on={s.sound} onToggle={() => set('sound', !s.sound)} /></Row>
          <Row label="Musique"><Switch label="Musique" on={s.music} onToggle={() => set('music', !s.music)} /></Row>
          <Row label="Réduire les animations"><Switch label="Réduire les animations" on={s.reduceMotion} onToggle={() => set('reduceMotion', !s.reduceMotion)} /></Row>
        </Group>

        <Group title="Profil et Daily compétitif">
          <Row label="Participer au Daily compétitif"><Switch label="Participer au Daily compétitif" on={s.leaderboardOptIn} onToggle={() => set('leaderboardOptIn', !s.leaderboardOptIn)} /></Row>
          <Row label="Pseudo">
            <TextInput value={pseudo} onChangeText={setPseudo} maxLength={16} placeholder="anon" placeholderTextColor={C.ghost} accessibilityLabel="Pseudo"
              style={[num, { height: 38, width: 150, borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, paddingHorizontal: 10, textAlign: 'right', backgroundColor: C.white, color: C.graphite }]} />
          </Row>
        </Group>

        <Group title="Aide">
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Help')}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
            <Text style={{ fontSize: 15.5, color: C.graphite }}>Comment jouer</Text>
            <ChevronRight size={18} strokeWidth={2.2} color={C.graphite} />
          </Pressable>
        </Group>

        <View>
          {!confirm
            ? <Button variant="pen" label="Effacer ma progression" height={48} onPress={() => setConfirm(true)} />
            : (
              <Sheet inner={{ padding: 16, gap: 12 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: C.graphite }}>Effacer niveaux, records et XP sur cet appareil ? C'est définitif.</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Button label="Annuler" style={{ flex: 1 }} onPress={() => setConfirm(false)} />
                  <Button variant="pen" label="Effacer" style={{ flex: 1 }} onPress={() => { reset(); setConfirm(false); }} />
                </View>
              </Sheet>
            )}
          <Text style={{ color: C.mine, fontSize: 13, lineHeight: 18, marginTop: 8 }}>Ta progression et tes réglages sont enregistrés sur cet appareil.</Text>
        </View>
      </ScrollView>
      <TabBar />
    </Screen>
  );
}
