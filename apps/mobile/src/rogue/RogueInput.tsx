import { useEffect, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { TextInput, Text, View, StyleSheet, Keyboard } from "react-native";
import { evaluate } from "@shortest/engine";
import type {
  RogueAction,
  RogueView,
} from "@shortest/engine/rogue-v1/controller";
import { Button, Tile } from "../components/ui";
import { editExpression } from "@shortest/engine/rogue-v1";
import type { ExpressionAction, Rules } from "@shortest/engine/rogue-v1";

export function NativeExpressionInput({
  rules,
  busy,
  onSubmit,
  onEdit,
  practice = false,
}: {
  rules: Rules;
  busy: boolean;
  onSubmit: (expression: string) => void;
  onEdit?: (expression: string) => void;
  practice?: boolean;
}) {
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
    <View style={{ gap: 12 }}>
      <Text style={styles.label}>Votre expression</Text>
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
        style={styles.input}
        placeholder="3 + 5 × 7…"
        placeholderTextColor="#687185"
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
      <Text style={styles.muted}>Valeur calculée : {value}</Text>
      <Text style={styles.muted}>
        Touchez le champ pour placer le curseur. Les flèches déplacent le
        curseur ; Sélectionner étend le segment à corriger.
      </Text>
      <View style={styles.row}>
        {(
          [
            ["gauche", -1],
            ["droite", 1],
          ] as const
        ).map(([label, direction]) => (
          <Button
            key={label}
            label={direction < 0 ? "← Curseur" : "Curseur →"}
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
          label="Sélectionner"
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
      <View
        collapsable={false}
        pointerEvents={busy ? "none" : "auto"}
        style={{ gap: 10 }}
      >
        <View style={styles.row}>
          {rules.numbers.map((n) => (
            <Tile
              key={n}
              label={String(n)}
              kind="num"
              onPress={() => edit({ type: "insert", token: String(n) })}
            />
          ))}
        </View>
        <View style={styles.row}>
          {rules.operations.map((op) => (
            <Tile
              key={op}
              label={op === "*" ? "×" : op === "-" ? "−" : "+"}
              kind="op"
              onPress={() => edit({ type: "insert", token: op })}
            />
          ))}
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            label="Effacer"
            disabled={busy || !text}
            onPress={() => edit({ type: "erase" })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Vider"
            disabled={busy || !text}
            onPress={() => edit({ type: "clear" })}
          />
        </View>
      </View>
      <Button
        label="Valider ma réponse"
        variant="primary"
        disabled={busy || !text}
        onPress={() => onSubmit(text)}
      />
      {!practice && (
        <Text style={styles.muted}>
          Une réponse définitive incorrecte peut coûter une vie. Sans
          parenthèses, multiplication prioritaire.
        </Text>
      )}
    </View>
  );
}
export function RogueInput({
  view,
  busy,
  send,
}: {
  view: RogueView;
  busy: boolean;
  send: (action: RogueAction) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <NativeExpressionInput
        rules={view.puzzle!.rules}
        busy={busy}
        onSubmit={(expression) => send({ type: "submit", expression })}
      />
      <Button
        label={`Indice partiel · ${view.hints} restant(s)`}
        disabled={busy || view.hints === 0}
        onPress={() => send({ type: "hint" })}
      />
      <Text style={styles.muted}>
        −15 % au score par indice ; le temps continue.
      </Text>
      {view.hintMessages.map((message) => (
        <Text
          key={message}
          accessibilityLiveRegion="polite"
          style={styles.hint}
        >
          {message}
        </Text>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  label: { fontWeight: "600", color: "#53596d" },
  input: {
    borderWidth: 1,
    borderColor: "#c7c5dd",
    borderRadius: 14,
    padding: 15,
    fontSize: 23,
    textAlign: "center",
    color: "#25243f",
    backgroundColor: "#fff",
    minHeight: 56,
  },
  muted: { fontSize: 12, color: "#5a6b7b", lineHeight: 18 },
  hint: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#fff5de",
    color: "#685021",
    lineHeight: 20,
  },
});
