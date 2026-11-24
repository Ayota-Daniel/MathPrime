/** Primitives natives de la direction « Cahier » (papier quadrillé, encre, stylo rouge, surligneur). */
import { useState, type ReactNode } from 'react';
import { View, Text as RNText, Pressable, StyleSheet, type ViewStyle, type StyleProp, type TextStyle, type TextProps } from 'react-native';
import { Heart, Star, Flame, ChevronLeft } from 'lucide-react-native';
import { C } from '../theme';
import { audio } from '../audio';

export { C };
/** Chiffres alignés (Recursive a des chiffres tabulaires). */
export const num: TextStyle = { fontVariant: ['tabular-nums'] };

/** Fichier Recursive correspondant à une graisse (les instances sont statiques). */
export function recursive(weight?: TextStyle['fontWeight']): string {
  const w = weight === 'bold' ? 700 : Number(weight ?? 400) || 400;
  return w >= 900 ? 'RecursiveBlack' : w >= 800 ? 'RecursiveExtraBold' : w >= 600 ? 'RecursiveBold' : 'RecursiveRegular';
}

/** Texte en Recursive : la graisse demandée choisit le fichier de police. */
export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  return <RNText {...props} style={[flat, { fontFamily: flat.fontFamily ?? recursive(flat.fontWeight), fontWeight: 'normal' }]} />;
}
export const fmt = (n: number): string => n.toLocaleString('fr-FR');

/** Conteneur d'écran (le papier quadrillé et les marges viennent de GameScreen). */
export function Screen({ children }: { children: ReactNode; bottomInset?: boolean }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

/** Feuille posée : bordure graphite 1,5 px + ombre décalée nette (3 px), identique iOS/Android. */
export function Sheet({ children, style, inner, shadow = C.graphite, border = C.graphite, bg = C.white, pressed }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; inner?: StyleProp<ViewStyle>;
  shadow?: string | null; border?: string; bg?: string; pressed?: boolean;
}) {
  return (
    <View style={style}>
      {shadow && !pressed && <View style={{ position: 'absolute', top: 3, left: 3, right: -3, bottom: -3, backgroundColor: shadow, borderRadius: 6 }} />}
      <View style={[{ backgroundColor: bg, borderWidth: 1.5, borderColor: border, borderRadius: 6 }, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] }, inner]}>
        {children}
      </View>
    </View>
  );
}

/** Feuille cliquable : s'enfonce à l'appui. */
export function PressSheet({ children, onPress, style, inner, label, shadow, border, bg, disabled }: {
  children: ReactNode; onPress: () => void; style?: StyleProp<ViewStyle>; inner?: StyleProp<ViewStyle>; label?: string;
  shadow?: string | null; border?: string; bg?: string; disabled?: boolean;
}) {
  const [down, setDown] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} style={[style, disabled && { opacity: 0.45 }]}
      onPressIn={() => setDown(true)} onPressOut={() => setDown(false)}
      onPress={() => { void audio.play('select'); onPress(); }}>
      <Sheet pressed={down} inner={inner} shadow={shadow} border={border} bg={bg}>{children}</Sheet>
    </Pressable>
  );
}

/** Bouton texte. `ink` = action principale, `line` = secondaire, `pen` = destructif. */
export function Button({ label, variant = 'line', onPress, disabled, icon, style, height = 52 }: {
  label: string; variant?: 'ink' | 'line' | 'pen' | 'primary' | 'ghost'; onPress: () => void; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>; height?: number;
}) {
  const ink = variant === 'ink' || variant === 'primary';
  const color = ink ? C.white : variant === 'pen' ? C.pen : C.graphite;
  return (
    <PressSheet onPress={onPress} disabled={disabled} label={label} style={style}
      shadow={ink ? C.graphite : null} border={ink ? C.ink : variant === 'pen' ? C.pen : C.graphite} bg={ink ? C.ink : C.white}
      inner={{ minHeight: height, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10 }}>
      {icon}
      <Text style={{ color, fontWeight: '800', fontSize: 16 }}>{label}</Text>
    </PressSheet>
  );
}

/** Touche du clavier de jeu. `required` = chiffre imposé (Big Challenge), en rouge. */
export function Key({ label, kind, onPress, required, aria }: { label: string; kind: 'num' | 'op'; onPress: () => void; required?: boolean; aria?: string }) {
  const op = kind === 'op';
  return (
    <PressSheet onPress={onPress} label={aria ?? label} style={{ flex: 1 }}
      shadow={required ? C.pen : C.graphite} border={required ? C.pen : C.graphite} bg={op ? C.inkSoft : C.white}
      inner={{ height: op ? 56 : 68, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[num, { fontSize: op ? 28 : 32, fontWeight: '800', color: required ? C.pen : op ? C.ink : C.graphite }]}>{label}</Text>
      {required && <View pointerEvents="none" style={{ position: 'absolute', width: 54, height: 48, borderRadius: 27, borderWidth: 2, borderColor: C.pen, transform: [{ rotate: '-8deg' }] }} />}
    </PressSheet>
  );
}

/** Texte surligné (trait jaune sur la moitié basse). */
export function Highlight({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <View style={{ alignSelf: 'center' }}>
      <View style={{ position: 'absolute', left: -6, right: -6, top: '52%', bottom: '10%', backgroundColor: C.hl }} />
      <Text style={style}>{children}</Text>
    </View>
  );
}

export function Title({ children, size = 30, color = C.ink }: { children: ReactNode; size?: number; color?: string }) {
  return <Text accessibilityRole="header" style={{ fontSize: size, fontWeight: '900', color, letterSpacing: -0.3 }}>{children}</Text>;
}

export function Pill({ children, color = C.graphite, label }: { children: ReactNode; color?: string; label?: string }) {
  return (
    <View accessible={!!label} accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderWidth: 1.5, borderColor: color, borderRadius: 17, backgroundColor: C.white }}>
      {typeof children === 'string' || typeof children === 'number'
        ? <Text style={{ fontWeight: '700', fontSize: 14, color }}>{children}</Text> : children}
    </View>
  );
}

export function StreakPill({ value }: { value: number }) {
  return (
    <Pill label={`Série en cours : ${value}`}>
      <Flame size={16} color={C.pen} strokeWidth={2.2} />
      <Text style={{ fontWeight: '700', fontSize: 14, color: C.graphite }}>{value}</Text>
    </Pill>
  );
}

export function Stars({ value, size = 30 }: { value: number; size?: number }) {
  return (
    <View accessible accessibilityLabel={`${value} étoile${value > 1 ? 's' : ''} sur 3`} style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3].map((i) => <Star key={i} size={size} strokeWidth={1.6} fill={i <= value ? C.hl : 'none'} color={i <= value ? C.graphite : C.ghost} />)}
    </View>
  );
}

export function Hearts({ lives, max }: { lives: number; max: number }) {
  return (
    <View accessible accessibilityLabel={`${lives} vie${lives > 1 ? 's' : ''} sur ${max}`} style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => <Heart key={i} size={22} fill={i < lives ? C.pen : 'none'} color={i < lives ? C.pen : C.ghost} />)}
    </View>
  );
}

/** Interrupteur (rôle switch pour les lecteurs d'écran). */
export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onToggle} hitSlop={8}
      style={{ width: 50, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.graphite, backgroundColor: on ? C.ink : C.grid, justifyContent: 'center' }}>
      <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.graphite, marginLeft: on ? 23 : 3 }} />
    </Pressable>
  );
}

/** Bouton retour carré. */
export function BackButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.graphite, borderRadius: 6, backgroundColor: C.white }}>
      <ChevronLeft size={22} strokeWidth={2.2} color={C.graphite} />
    </Pressable>
  );
}

/** Lignes séparées par des pointillés, dans une feuille. */
export function Rows({ children, style }: { children: ReactNode[]; style?: StyleProp<ViewStyle> }) {
  const items = children.filter(Boolean);
  return (
    <Sheet style={style} inner={{ paddingHorizontal: 16 }}>
      {items.map((c, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.dash } : undefined}>{c}</View>
      ))}
    </Sheet>
  );
}
