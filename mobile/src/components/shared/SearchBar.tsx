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
  const styles = useThemedStyles((colors) => ({
    searchbar: { marginBottom: spacing.md, elevation: 0, backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
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


