import { useEffect, useRef, useState } from "react";
import type { ComponentRef, ReactNode } from "react";
import {
  TextInput,
  Text,
  View,
  StyleSheet,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import { rogue } from "@shortest/tokens";
import { RC, themed } from "../theme";
import { evaluate } from "@shortest/engine";
import type {
  RogueAction,
  RogueView,
} from "@shortest/engine/rogue-v1/controller";
import { Button, Tile } from "./ui";
import { editExpression } from "@shortest/engine/rogue-v1";
import type { ExpressionAction, Rules } from "@shortest/engine/rogue-v1";

export function NativeExpressionInput({
  rules,
  busy,
  onSubmit,
  onEdit,
  practice = false,
  hintButton,
}: {
  rules: Rules;
  busy: boolean;
  onSubmit: (expression: string) => void;
  onEdit?: (expression: string) => void;
  practice?: boolean;
  hintButton?: ReactNode;
}) {
  const comfortable = useWindowDimensions().height >= rogue.roomyHeight;
  useEffect(() => {
    Keyboard.dismiss();
  }, []);
  const [text, setText] = useState("");
  const cursor = useRef({ start: 0, end: 0 });
  const [selection, setSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const normalized = text
    .replace(/\s/g, "")
    .replace(/×/g, "*")
    .replace(/−/g, "-");
  const value = /^[357](?:[+*\-][357])*$/.test(normalized)
    ? evaluate(normalized)
    : "—";
  function edit(action: ExpressionAction) {
    if (busy) return;
    const result = editExpression(
      text,
      cursor.current,
      action,
      rules.operations,
    );
    cursor.current = result.selection;
    setText(result.text);
    onEdit?.(result.text);
    setSelection(result.selection);
    input.current?.focus();
  }
  function rejectExternalEdit() {
    const preserved = { ...cursor.current };
    input.current?.setNativeProps({ text });
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      cursor.current = preserved;
      setSelection(preserved);
      input.current?.focus();
    });
  }
  return (
    <View style={{ gap: comfortable ? 10 : 6 }}>
      <TextInput
        ref={input}
        accessibilityLabel="Votre expression"
        value={text}
        showSoftInputOnFocus={false}
        contextMenuHidden
        onChangeText={rejectExternalEdit}
        selection={selection}
        onSelectionChange={(event) => {
          cursor.current = event.nativeEvent.selection;
          setSelection(event.nativeEvent.selection);
        }}
        style={[styles.input, comfortable && { height: 60, fontSize: 30 }]}
        placeholder="3 + 5 × 7…"
        placeholderTextColor={RC.muted}
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={150}
        editable
        returnKeyType="done"
        blurOnSubmit={false}
        onSubmitEditing={() => {
          if (text && !busy) onSubmit(text);
        }}
      />
      <View style={styles.between}>
        <Text style={[styles.muted, { flex: 1 }]}>
          vaut <Text style={styles.value}>{value}</Text>
        </Text>
        <View style={styles.row}>
          {(
            [
              ["gauche", -1],
              ["droite", 1],
            ] as const
          ).map(([label, direction]) => (
            <Button
              compact
              key={label}
              label={direction < 0 ? "←" : "→"}
              wide
              accessibilityLabel={`Curseur à ${label}`}
              disabled={busy}
              onPress={() => {
                const position = Math.max(
                  0,
                  Math.min(
                    text.length,
                    (direction < 0 ? cursor.current.start : cursor.current.end) +
                      direction,
                  ),
                );
                cursor.current = { start: position, end: position };
                setSelection(cursor.current);
                input.current?.focus();
              }}
            />
          ))}
          <Button
            compact
            label="Sélect."
            accessibilityLabel="Sélectionner"
            disabled={busy || !text}
            onPress={() => {
              const start = Math.max(
                0,
                Math.min(
                  cursor.current.start,
                  cursor.current.end,
                  text.length - 1,
                ),
              );
              const end = Math.min(
                text.length,
                Math.max(
                  start + 1,
                  cursor.current.end +
                    (cursor.current.end > cursor.current.start ? 1 : 0),
                ),
              );
              cursor.current = { start, end };
              setSelection(cursor.current);
              input.current?.focus();
            }}
          />
        </View>
      </View>
      {practice && (
        <Text style={styles.muted}>
          Touchez le champ pour placer le curseur. Les flèches déplacent le
          curseur ; Sélectionner étend le segment à corriger.
        </Text>
      )}
      <View
        collapsable={false}
        pointerEvents={busy ? "none" : "auto"}
        style={{ gap: comfortable ? 10 : 6 }}
      >
        <View style={styles.keys}>
          {rules.numbers.map((n) => (
            <Tile
              key={n}
              label={String(n)}
              disabled={busy}
              kind="num"
              onPress={() => edit({ type: "insert", token: String(n) })}
            />
          ))}
        </View>
        <View style={styles.keys}>
          {rules.operations.map((op) => (
            <Tile
              key={op}
              label={op === "*" ? "×" : op === "-" ? "−" : "+"}
              disabled={busy}
              kind="op"
              onPress={() => edit({ type: "insert", token: op })}
            />
          ))}
        </View>
      </View>
      <View style={styles.keys}>
        <View style={{ flex: 1 }}>
          <Button
            compact
            label="Effacer"
            disabled={busy || !text}
            onPress={() => edit({ type: "erase" })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            compact
            label="Vider"
            disabled={busy || !text}
            onPress={() => edit({ type: "clear" })}
          />
        </View>
        {hintButton && <View style={{ flex: 1 }}>{hintButton}</View>}
      </View>
      <Button
        compact
        label="Valider"
        accessibilityLabel="Valider ma réponse"
        variant="primary"
        disabled={busy || !text}
        onPress={() => onSubmit(text)}
      />
    </View>
  );
}
export function RogueInput({
  view,
  busy,
  send,
  onHint,
}: {
  view: RogueView;
  busy: boolean;
  send: (action: RogueAction) => void;
  onHint: () => void;
}) {
  return (
    <NativeExpressionInput
      rules={view.puzzle!.rules}
      busy={busy}
      onSubmit={(expression) => send({ type: "submit", expression })}
      hintButton={
        <Button
          compact
          variant="hint"
          label={`Indice (${view.hints})`}
          accessibilityLabel={`Indice partiel · ${view.hints} restant(s)`}
          accessibilityHint="Moins 15 % au score de ce puzzle ; le temps continue."
          disabled={busy || view.hints === 0}
          onPress={onHint}
        />
      }
    />
  );
}
const styles = themed(() => StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  keys: { flexDirection: "row", gap: 10 },
  between: { flexDirection: "row", alignItems: "center", gap: 8 },
  value: { color: RC.ivory, fontFamily: rogue.font.display },
  input: {
    borderBottomWidth: 3,
    borderColor: RC.coral,
    backgroundColor: RC.raised,
    borderRadius: rogue.radius.panel,
    paddingHorizontal: 8,
    paddingVertical: 0,
    fontSize: 26,
    height: 56,
    fontFamily: rogue.font.display,
    textAlign: "center",
    color: RC.ivory,
  },
  muted: {
    fontSize: 13.5,
    color: RC.muted,
    lineHeight: 19,
    fontFamily: rogue.font.body,
  },
}));
