import { useCallback, useContext, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { confirmAction, showMessage } from '../utils/dialogs';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const { isTeacher } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewerImage, setViewerImage] = useState(null);
  const attachments = post?.attachments?.length
    ? post.attachments
    : post?.attachment
      ? [post.attachment]
      : [];

  const loadPost = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/posts/${postId}`);
      setPost(data);
    } catch (error) {
      console.error('Unable to load post:', error);
      showMessage('Erro', 'Não foi possível carregar a postagem.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useFocusEffect(useCallback(() => {
    loadPost();
  }, [loadPost]));

  const deletePost = async () => {
    confirmAction('Excluir postagem', 'Deseja excluir esta postagem?', async () => {
      try {
        await api.delete(`/posts/${postId}`);
        navigation.goBack();
      } catch (error) {
        showMessage('Erro', error.response?.data?.error || 'Não foi possível excluir a postagem.');
      }
    });
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, { text: comment.trim() });
      setPost(data);
      setComment('');
    } catch (error) {
      showMessage('Erro', error.response?.data?.error || 'Não foi possível enviar o comentário.');
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const { data } = await api.delete(`/posts/${postId}/comments/${commentId}`);
      setPost(data);
    } catch (error) {
      showMessage('Erro', error.response?.data?.error || 'Não foi possível excluir o comentário.');
    }
  };

  if (!post) {
    return <View style={styles.center}><Text>{loading ? 'Carregando...' : 'Postagem indisponível.'}</Text></View>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.meta}>Por {post.author}</Text>
      {post.coverImage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir imagem"
          onPress={() => setViewerImage(post.coverImage)}
        >
          <Image
            source={{ uri: post.coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => console.error('Unable to display post cover image.')}
          />
        </Pressable>
      ) : null}
      <Text style={styles.body}>{post.content}</Text>

      {!!attachments.length && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anexos</Text>
          {attachments.map((attachment, index) => {
            const isImage = attachment.startsWith('data:image') || /^https?:\/\/.+\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(attachment);
            const isPdf = attachment.startsWith('data:application/pdf')
              || /^https?:\/\/.+\.pdf(\?.*)?$/i.test(attachment);
            return isImage ? (
              <Pressable
                key={`${index}-${attachment.slice(0, 32)}`}
                accessibilityRole="button"
                accessibilityLabel={`Abrir imagem do anexo ${index + 1}`}
                onPress={() => setViewerImage(attachment)}
              >
                <Image
                  source={{ uri: attachment }}
                  style={styles.attachmentImage}
                  resizeMode="contain"
                  onError={() => console.error(`Unable to display post attachment ${index + 1}.`)}
                />
              </Pressable>
            ) : (
              <Text key={`${index}-${attachment.slice(0, 32)}`} style={styles.attachment}>
                Anexo {index + 1}: {isPdf ? 'Arquivo PDF anexado.' : 'Formato de anexo não compatível para visualização.'}
              </Text>
            );
          })}
        </View>
      )}

      {isTeacher && (
        <View style={styles.actions}>
          <Pressable style={styles.editButton} onPress={() => navigation.navigate('PostForm', { postId })}>
            <Text style={styles.actionText}>Editar</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={deletePost}>
            <Text style={styles.actionText}>Excluir</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comentários ({post.comments?.length || 0})</Text>
        {post.comments?.map((item) => (
          <View key={String(item._id || item.id)} style={styles.comment}>
            <Text style={styles.commentBody}>{item.text}</Text>
            <Text style={styles.meta}>Por {item.author}</Text>
            {isTeacher && (
              <Pressable onPress={() => deleteComment(item._id || item.id)}>
                <Text style={styles.deleteText}>Excluir comentário</Text>
              </Pressable>
            )}
          </View>
        ))}
        {!post.comments?.length && <Text style={styles.meta}>Nenhum comentário.</Text>}
        <View style={styles.commentForm}>
          <TextInput
            style={styles.commentInput}
            placeholder="Escreva um comentário"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <Pressable style={styles.primaryButton} onPress={addComment}>
            <Text style={styles.actionText}>Enviar comentário</Text>
          </Pressable>
        </View>
      </View>
      <Modal
        visible={Boolean(viewerImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
      >
        <View style={styles.imageViewer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar imagem"
            style={styles.imageViewerClose}
            onPress={() => setViewerImage(null)}
          >
            <Text style={styles.imageViewerCloseText}>Fechar</Text>
          </Pressable>
          {viewerImage && (
            <Image source={{ uri: viewerImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 18, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  title: { color: '#0f172a', fontWeight: '700', fontSize: 28, marginBottom: 8 },
  meta: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  body: { color: '#1e293b', fontSize: 16, lineHeight: 25, marginVertical: 12 },
  coverImage: { width: '100%', height: 240, borderRadius: 12, marginVertical: 12, backgroundColor: '#e2e8f0' },
  actions: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  editButton: { flex: 1, backgroundColor: '#d97706', borderRadius: 10, padding: 12, alignItems: 'center' },
  deleteButton: { flex: 1, backgroundColor: '#dc2626', borderRadius: 10, padding: 12, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },
  section: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 18, marginTop: 18 },
  sectionTitle: { color: '#0f172a', fontWeight: '700', fontSize: 19, marginBottom: 12 },
  attachment: { color: '#475569', marginBottom: 10 },
  attachmentImage: { width: '100%', height: 240, borderRadius: 10, marginBottom: 12, backgroundColor: '#e2e8f0' },
  comment: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  commentBody: { color: '#1e293b', marginBottom: 6, lineHeight: 21 },
  deleteText: { color: '#dc2626', fontWeight: '600', marginTop: 6 },
  commentForm: { marginTop: 12 },
  commentInput: { minHeight: 90, textAlignVertical: 'top', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12 },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  imageViewer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 16 },
  imageViewerClose: { position: 'absolute', top: 48, right: 20, zIndex: 1, padding: 12 },
  imageViewerCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fullImage: { width: '100%', height: '85%' },
});
