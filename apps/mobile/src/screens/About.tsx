/** « Comment jouer » : règles, exemple et barème des étoiles. */
import type { ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../../App';
import { loadTable } from '../data';
import { C, num, fmt, Screen, BackButton } from '../components/ui';

const P = ({ children }: { children: ReactNode }) => <Text style={{ fontSize: 14.5, lineHeight: 22, color: C.graphite }}>{children}</Text>;

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingTop: 16 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[num, { color: C.ink, fontWeight: '900' }]}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={{ marginTop: 4, marginBottom: 4, fontSize: 17, fontWeight: '800', color: C.graphite }}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

export function About({ navigation }: NativeStackScreenProps<RootStack, 'About'>) {
  const count = loadTable('classic').length;
  const scale: [string, string][] = [["Aussi court que l'optimal", '3 étoiles'], ['Un chiffre de plus', '2 étoiles'], ['Au-delà', '1 étoile']];
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14 }}>
        <BackButton label="Retour aux réglages" onPress={() => navigation.goBack()} />
        <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '900', color: C.ink }}>Comment jouer</Text>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 }}>
        <Step n={1} title="Atteins la cible">
          <P>Avec les chiffres 3, 5 et 7 et les signes +, − et ×. Pas de parenthèses : × se calcule avant + et −.</P>
          <View style={{ marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6 }}>
            <Text style={[num, { fontSize: 18, fontWeight: '800', color: C.graphite }]}>7×7−5+3 <Text style={{ color: C.mine, fontWeight: '600' }}>=</Text> 47</Text>
          </View>
        </Step>
        <Step n={2} title="Fais le plus court">
          <P>On compte les chiffres utilisés. Le trait rouge « optimal » montre la longueur à viser.</P>
          <View style={{ marginTop: 8 }}>
            {scale.map(([k, v], i) => (
              <View key={k} style={[{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }, i > 0 && { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash }]}>
                <Text style={{ fontSize: 14.5, color: C.graphite }}>{k}</Text><Text style={{ fontSize: 14.5, fontWeight: '800', color: C.graphite }}>{v}</Text>
              </View>
            ))}
          </View>
        </Step>
        <Step n={3} title="Utilise les indices avec prudence">
          <P>Chaque indice dévoile un symbole de la solution, mais baisse le nombre d'étoiles possible.</P>
        </Step>
        <View style={{ marginTop: 'auto', paddingTop: 14, borderTopWidth: 1.5, borderColor: C.graphite }}>
          <Text style={{ color: C.mine, fontSize: 13, lineHeight: 18 }}>
            Les {fmt(count)} cibles sont résolues à l'avance par un solveur qui garantit la solution la plus courte. MathPrime fonctionne hors ligne.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
