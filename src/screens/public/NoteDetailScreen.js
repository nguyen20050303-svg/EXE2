import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDate } from '../../utils/helpers';

export default function NoteDetailScreen({ note, onBack }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Notes</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{note?.title}</Text>
      <Text style={styles.date}>{formatDate(note?.updatedAt)}</Text>
      <Text style={styles.content}>{note?.content}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F5',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 18,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
  },
});
