import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { goalsApi } from '../core/api/goals';

export function HomeScreen() {
  const { user } = useAuth();
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.list(),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Hello, {user?.name ?? 'User'}</Text>
      {goalsLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>Goals: {goals?.length ?? 0}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  spinner: {
    marginTop: 16,
  },
  summary: {
    marginTop: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});
