import { useState, type ReactNode } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { appThemes, appThemeById, rogueThemes, rogueThemeById } from '@shortest/tokens';
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

/** Choix d'une couleur : pastilles rondes (accent) ou carrées (page Rogue, avec sa couleur d'action). */
function Swatches({ legend, current, options, onChange }: {
  legend: string; current: string;
  options: readonly { id: string; name: string; fill: string; dot?: string }[];
  onChange: (id: string) => void;
}) {
  const round = !options[0]?.dot;
  return (
    <View style={{ paddingVertical: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 15.5, fontWeight: '700', color: C.graphite }}>{legend}</Text>
        <Text style={{ fontSize: 13.5, color: C.mine }}>{options.find((o) => o.id === current)?.name}</Text>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={legend} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {options.map((o) => {
          const on = o.id === current;
          return (
            <Pressable key={o.id} accessibilityRole="radio" accessibilityLabel={o.name} accessibilityState={{ checked: on }} onPress={() => onChange(o.id)}
              style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: on ? C.graphite : 'transparent', borderRadius: round ? 24 : 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: round ? 18 : 5, backgroundColor: o.fill, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 4 }}>
                {o.dot && <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: o.dot }} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

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
        <Group title="Apparence">
          <Swatches legend="Couleur d'accent" current={appThemeById(s.appTheme).id}
            options={appThemes.map((t) => ({ id: t.id, name: t.name, fill: t.colors.ink }))} onChange={(id) => set('appTheme', id)} />
          <Swatches legend="Page Rogue" current={rogueThemeById(s.rogueTheme).id}
            options={rogueThemes.map((t) => ({ id: t.id, name: t.name, fill: t.colors.night, dot: t.colors.coral }))} onChange={(id) => set('rogueTheme', id)} />
        </Group>

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
