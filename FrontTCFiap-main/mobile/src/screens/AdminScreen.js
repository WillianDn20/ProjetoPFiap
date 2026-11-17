import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { confirmAction, showMessage } from '../utils/dialogs';

export default function AdminScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/posts');
      setPosts(data);
    } catch (error) {
      console.error('Unable to load posts for administration:', error);
      showMessage('Erro', 'Não foi possível carregar as postagens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadPosts();
  }, [loadPosts]));

  const deletePost = async (id) => {
    confirmAction('Excluir postagem', 'Deseja excluir esta postagem?', async () => {
      try {
        await api.delete(`/posts/${id}`);
        await loadPosts();
      } catch (error) {
        showMessage('Erro', error.response?.data?.error || 'Não foi possível excluir a postagem.');
      }
    });
  };

  const navigateToRoot = (screen, params) => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate(screen, params);
      return;
    }
    navigation.navigate(screen, params);
  };

  return (
    <View style={styles.screen}>
      <Pressable style={styles.newButton} onPress={() => navigateToRoot('PostForm')}>
        <Text style={styles.buttonText}>+ Nova postagem</Text>
      </Pressable>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item._id || item.id)}
        refreshing={loading}
        onRefresh={loadPosts}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => navigateToRoot('PostDetail', { postId: item._id || item.id })}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>Por {item.author}</Text>
              <Text numberOfLines={2} style={styles.preview}>{item.content}</Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                style={styles.editButton}
                onPress={() => navigateToRoot('PostForm', { postId: item._id || item.id })}
              >
                <Text style={styles.buttonText}>Editar</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => deletePost(item._id || item.id)}>
                <Text style={styles.buttonText}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Carregando...' : 'Nenhuma postagem cadastrada.'}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  list: { paddingBottom: 24 },
  newButton: { backgroundColor: '#16a34a', borderRadius: 12, padding: 13, alignItems: 'center', marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  title: { color: '#0f172a', fontSize: 18, fontWeight: '700', marginBottom: 5 },
  meta: { color: '#64748b', fontSize: 12, marginBottom: 8 },
  preview: { color: '#334155', lineHeight: 20, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  editButton: { flex: 1, backgroundColor: '#d97706', borderRadius: 10, padding: 10, alignItems: 'center' },
  deleteButton: { flex: 1, backgroundColor: '#dc2626', borderRadius: 10, padding: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 24 },
});
