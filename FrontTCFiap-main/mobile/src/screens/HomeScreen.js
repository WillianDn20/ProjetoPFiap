import { useCallback, useContext, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { showMessage } from '../utils/dialogs';

export default function HomeScreen({ navigation }) {
  const { isTeacher } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(query ? '/posts/search' : '/posts', {
        params: query ? { term: query } : undefined,
      });
      setPosts(data);
    } catch (error) {
      console.error('Unable to load posts:', error);
      showMessage('Erro', 'Não foi possível carregar as postagens.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useFocusEffect(useCallback(() => {
    loadPosts();
  }, [loadPosts]));

  const handleSearch = () => setQuery(term.trim());
  const navigateToRoot = (screen, params) => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate(screen, params);
      return;
    }
    navigation.navigate(screen, params);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={handleSearch}
          placeholder="Buscar por palavra-chave"
          returnKeyType="search"
        />
        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.buttonText}>Buscar</Text>
        </Pressable>
      </View>
      {isTeacher && (
        <Pressable style={styles.newButton} onPress={() => navigateToRoot('PostForm')}>
          <Text style={styles.buttonText}>+ Nova postagem</Text>
        </Pressable>
      )}
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item._id || item.id)}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadPosts}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigateToRoot('PostDetail', { postId: item._id || item.id })}
          >
            {item.coverImage ? (
              <Image
                source={{ uri: item.coverImage }}
                style={styles.cardImage}
                resizeMode="cover"
                onError={() => console.error(`Unable to display cover image for post ${item._id || item.id}.`)}
              />
            ) : null}
            {!item.coverImage && (
              (item.attachments?.[0] || item.attachment)?.startsWith('data:image') ? (
                <Image
                  source={{ uri: item.attachments?.[0] || item.attachment }}
                  style={styles.cardImage}
                  resizeMode="cover"
                  onError={() => console.error(`Unable to display attachment image for post ${item._id || item.id}.`)}
                />
              ) : null
            )}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>Por {item.author}</Text>
            <Text style={styles.excerpt} numberOfLines={3}>{item.content}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Carregando postagens...' : 'Nenhuma postagem encontrada.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff' },
  searchButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  newButton: { backgroundColor: '#16a34a', borderRadius: 12, padding: 13, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardImage: { width: '100%', height: 190, borderRadius: 10, marginBottom: 12, backgroundColor: '#e2e8f0' },
  title: { color: '#0f172a', fontWeight: '700', fontSize: 20, marginBottom: 6 },
  meta: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  excerpt: { color: '#334155', lineHeight: 21 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 28 },
});
