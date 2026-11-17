import React, { useCallback, useContext, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { confirmAction, showMessage } from '../utils/dialogs';

export default function NoticesScreen() {
  const { isTeacher } = useContext(AuthContext);
  const [notices, setNotices] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notices');
      setNotices(data);
    } catch (error) {
      console.error('Unable to load notices:', error);
      showMessage('Erro', error.response?.data?.error || 'Não foi possível carregar os avisos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadNotices();
  }, [loadNotices]));

  const addNotice = async () => {
    if (!text.trim()) {
      showMessage('Aviso vazio', 'Escreva o aviso antes de publicar.');
      return;
    }

    try {
      await api.post('/notices', { text: text.trim() });
      setText('');
      await loadNotices();
    } catch (error) {
      showMessage('Erro', error.response?.data?.error || 'Não foi possível publicar o aviso.');
    }
  };

  const deleteNotice = (notice) => {
    confirmAction('Excluir aviso', 'Deseja excluir este aviso?', async () => {
      try {
        await api.delete(`/notices/${notice._id}`);
        await loadNotices();
      } catch (error) {
        showMessage('Erro', error.response?.data?.error || 'Não foi possível excluir o aviso.');
      }
    });
  };

  return (
    <View style={styles.screen}>
      {isTeacher && (
        <View style={styles.form}>
          <Text style={styles.heading}>Publicar aviso</Text>
          <TextInput
            style={styles.input}
            placeholder="Escreva um aviso para alunos e professores"
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable style={styles.addButton} onPress={addNotice}>
            <Text style={styles.buttonText}>Publicar aviso</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={notices}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={loadNotices}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{item.text}</Text>
            <Text style={styles.meta}>
              {item.author ? `Por ${item.author} · ` : ''}
              {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : ''}
            </Text>
            {isTeacher && (
              <Pressable onPress={() => deleteNotice(item)}>
                <Text style={styles.deleteText}>Excluir aviso</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Carregando avisos...' : 'Nenhum aviso publicado.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16 },
  heading: { color: '#0f172a', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  input: { minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, marginBottom: 10 },
  addButton: { backgroundColor: '#16a34a', borderRadius: 10, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  list: { paddingBottom: 24 },
  notice: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  noticeText: { color: '#1e293b', fontSize: 16, lineHeight: 23, marginBottom: 10 },
  meta: { color: '#64748b', fontSize: 12, marginBottom: 8 },
  deleteText: { color: '#dc2626', fontWeight: '700' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 20 },
});
