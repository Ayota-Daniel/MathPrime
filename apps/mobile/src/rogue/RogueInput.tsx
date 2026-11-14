import { useRef, useState } from "react";
import type { ComponentRef } from "react";
import { TextInput, Text, View, StyleSheet } from "react-native";
import { evaluate } from "@shortest/engine";
import type {
  RogueAction,
  RogueView,
} from "@shortest/engine/rogue-v1/controller";
import { Button, Tile } from "../components/ui";
import { insertToken } from "./presentation";

export function RogueInput({
  view,
  busy,
  send,
}: {
  view: RogueView;
  busy: boolean;
  send: (action: RogueAction) => void;
}) {
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
  function token(value: string) {
    const edit = insertToken(text, cursor.current, value);
    if (edit.text.length > 150) return;
    cursor.current = edit.selection;
    setText(edit.text);
    setSelection(edit.selection);
    input.current?.focus();
  }
  function erase() {
    const selection = cursor.current;
    const from =
      selection.start === selection.end
        ? Math.max(0, selection.start - 1)
        : selection.start;
    setText(text.slice(0, from) + text.slice(selection.end));
    cursor.current = { start: from, end: from };
    setSelection(cursor.current);
    input.current?.focus();
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.label}>Votre expression</Text>
      <TextInput
        ref={input}
        accessibilityLabel="Votre expression"
        value={text}
        onChangeText={(value) => {
          setText(value);
          setSelection(undefined);
        }}
        selection={selection}
        onSelectionChange={(event) => {
          cursor.current = event.nativeEvent.selection;
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
          if (text && !busy) send({ type: "submit", expression: text });
        }}
      />
      <Text style={styles.muted}>Valeur calculée : {value}</Text>
      <View
        collapsable={false}
        pointerEvents={busy ? "none" : "auto"}
        style={{ gap: 10 }}
      >
        <View style={styles.row}>
          {view.puzzle!.rules.numbers.map((n) => (
            <Tile
              key={n}
              label={String(n)}
              kind="num"
              onPress={() => token(String(n))}
            />
          ))}
        </View>
        <View style={styles.row}>
          {view.puzzle!.rules.operations.map((op) => (
            <Tile
              key={op}
              label={op === "*" ? "×" : op === "-" ? "−" : "+"}
              kind="op"
              onPress={() => token(op)}
            />
          ))}
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button label="Effacer" disabled={busy || !text} onPress={erase} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Vider"
            disabled={busy || !text}
            onPress={() => {
              setText("");
              cursor.current = { start: 0, end: 0 };
              setSelection(cursor.current);
              input.current?.focus();
            }}
          />
        </View>
      </View>
      <Button
        label="Valider ma réponse"
        variant="primary"
        disabled={busy || !text}
        onPress={() => send({ type: "submit", expression: text })}
      />
      <Text style={styles.muted}>
        Une réponse définitive incorrecte peut coûter une vie. Sans parenthèses,
        multiplication prioritaire.
      </Text>
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
