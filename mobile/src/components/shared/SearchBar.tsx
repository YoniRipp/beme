import React from 'react';
import { StyleSheet } from 'react-native';
import { Searchbar } from 'react-native-paper';

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
  searchbar: { marginBottom: 12, elevation: 0, backgroundColor: '#f3f4f6', borderRadius: 12 },
  input: { fontSize: 14 },
});
