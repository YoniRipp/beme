import React from 'react';
import { StyleSheet } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { colors, radius, spacing } from '../../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...' }: SearchBarProps) {
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

const styles = StyleSheet.create({
  searchbar: { marginBottom: spacing.md, elevation: 0, backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
  input: { fontSize: 14 },
});
