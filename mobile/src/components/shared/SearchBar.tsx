import React from 'react';
import { Searchbar } from 'react-native-paper';
import { radius, spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...' }: SearchBarProps) {
  /**
   * `muted`, not `surfaceMuted`, and this is the faintest case of the lot. With
   * `elevation: 0` and no border, the fill IS the field — there is no other edge telling
   * the user where to tap. Its only call site (`BodyScreen`) puts it straight on the page
   * ground, so it is measured against `background`, not a card:
   *
   *   surfaceMuted  1.10:1 dark / 1.07:1 light   <- what this was: no visible field
   *   muted         1.27:1 dark / 1.10:1 light
   *
   * Light is barely better either way, which is a real limit of a warm near-white palette
   * and not something to fix by inventing a colour here; dark is where the field was
   * effectively invisible, and dark is the default theme.
   */
  const styles = useThemedStyles((colors) => ({
    searchbar: { marginBottom: spacing.md, elevation: 0, backgroundColor: colors.muted, borderRadius: radius.md },
    input: { fontSize: 14 },
  }));
  return (
    <Searchbar
      placeholder={placeholder}
      onChangeText={onChangeText}
      value={value}
      style={styles.searchbar}
      inputStyle={styles.input}
    />
  );
}


