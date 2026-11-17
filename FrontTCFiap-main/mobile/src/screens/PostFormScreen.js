import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import api from '../services/api';
import { showMessage } from '../utils/dialogs';

const MAX_ATTACHMENTS = 3;

const inferMimeType = (name = '', mimeType) => {
  if (mimeType?.startsWith('image/') || mimeType === 'application/pdf') return mimeType;
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  const extension = name.split('.').pop()?.toLowerCase();
  const imageTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return imageTypes[extension] || '';
};

const encodeAsset = async (asset) => {
  const maxDimension = 1280;
  const resize = asset.width && asset.height && Math.max(asset.width, asset.height) > maxDimension
    ? {
      width: asset.width >= asset.height ? maxDimension : undefined,
      height: asset.height > asset.width ? maxDimension : undefined,
    }
    : undefined;
  const processedImage = await ImageManipulator.manipulateAsync(
    asset.uri,
    resize ? [{ resize }] : [],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  const base64 = processedImage.base64 || await FileSystem.readAsStringAsync(processedImage.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
};

const getAttachmentLabel = (attachment, index) => {
  if (attachment.name) return attachment.name;
  return `Anexo ${index + 1} · ${attachment.mimeType === 'application/pdf' ? 'PDF' : 'Imagem'}`;
};

export default function PostFormScreen({ route, navigation }) {
  const postId = route.params?.postId;
  const isEditing = Boolean(postId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!isEditing) return undefined;
    let active = true;
    api.get(`/posts/${postId}`)
      .then(({ data }) => {
        if (!active) return;
        setTitle(data.title || '');
        setContent(data.content || '');
        setCoverImage(data.coverImage || '');
        const existingAttachments = data.attachments || (data.attachment ? [data.attachment] : []);
        setAttachments(existingAttachments.map((uri, index) => {
          const mimeType = uri.startsWith('data:application/pdf')
            ? 'application/pdf'
            : 'image/*';
          return {
            data: uri,
            name: `Anexo ${index + 1} · ${mimeType === 'application/pdf' ? 'PDF' : 'Imagem'}`,
            mimeType,
          };
        }));
      })
      .catch((error) => {
        console.error('Unable to load post for editing:', error);
        showMessage('Erro', 'Não foi possível carregar a postagem para edição.');
      });
    return () => { active = false; };
  }, [isEditing, postId]);

  const pickCover = async () => {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mimeType = inferMimeType(asset.fileName, asset.mimeType) || 'image/jpeg';
      if (!mimeType.startsWith('image/')) {
        showMessage('Arquivo inválido', 'Selecione um arquivo de imagem para a capa.');
        return;
      }
      setCoverImage(await encodeAsset(asset));
    } catch (error) {
      console.error('Unable to select post cover:', error);
      showMessage('Erro', 'Não foi possível selecionar a imagem de capa.');
    } finally {
      setPicking(false);
    }
  };

  const pickAttachmentImages = async () => {
    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      showMessage('Limite de anexos', `Você pode adicionar até ${MAX_ATTACHMENTS} anexos.`);
      return;
    }

    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      });
      if (result.canceled) return;

      const selectedAssets = result.assets.slice(0, remainingSlots);
      const newAttachments = await Promise.all(selectedAssets.map(async (asset, index) => {
        const mimeType = inferMimeType(asset.fileName, asset.mimeType) || 'image/jpeg';
        return {
          data: await encodeAsset(asset),
          name: asset.fileName || `Imagem ${attachments.length + index + 1}`,
          mimeType,
        };
      }));
      setAttachments((current) => [...current, ...newAttachments]);
      if (result.assets.length > remainingSlots) {
        showMessage('Limite de anexos', `Foram adicionados até ${MAX_ATTACHMENTS} anexos.`);
      }
    } catch (error) {
      console.error('Unable to select post attachments:', error);
      showMessage('Erro', 'Não foi possível selecionar os anexos.');
    } finally {
      setPicking(false);
    }
  };

  const savePost = async () => {
    if (!title.trim() || !content.trim()) {
      showMessage('Campos obrigatórios', 'Informe o título e o conteúdo da postagem.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        coverImage,
        attachments: attachments.map(({ data }) => data),
      };
      if (isEditing) await api.put(`/posts/${postId}`, payload);
      else await api.post('/posts', payload);
      navigation.goBack();
    } catch (error) {
      console.error('Unable to save post:', error);
      showMessage('Erro', error.response?.data?.error || 'Não foi possível salvar a postagem.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>{isEditing ? 'Editar postagem' : 'Nova postagem'}</Text>
      <TextInput style={styles.input} placeholder="Título" value={title} onChangeText={setTitle} />
      <TextInput
        style={styles.textarea}
        placeholder="Conteúdo"
        value={content}
        onChangeText={setContent}
        multiline
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Imagem de capa</Text>
        {coverImage ? (
          <>
            <Image source={{ uri: coverImage }} style={styles.coverPreview} resizeMode="cover" />
            <Pressable style={styles.removeButton} onPress={() => setCoverImage('')} disabled={picking}>
              <Text style={styles.removeButtonText}>Remover capa</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.note}>Nenhuma imagem selecionada.</Text>
        )}
        <Pressable style={styles.secondaryButton} onPress={pickCover} disabled={picking || saving}>
          <Text style={styles.secondaryButtonText}>{picking ? 'Abrindo galeria...' : 'Adicionar imagem de capa'}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Anexos ({attachments.length}/{MAX_ATTACHMENTS})</Text>
        <Text style={styles.note}>Selecione imagens da galeria.</Text>
        {attachments.map((attachment, index) => (
          <View key={`${attachment.name}-${index}`} style={styles.attachmentRow}>
            <Text style={styles.attachmentName} numberOfLines={2}>
              {getAttachmentLabel(attachment, index)}
            </Text>
            <Pressable
              style={styles.removeButton}
              onPress={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              disabled={picking || saving}
            >
              <Text style={styles.removeButtonText}>Remover</Text>
            </Pressable>
          </View>
        ))}
        {attachments.length < MAX_ATTACHMENTS && (
          <Pressable style={styles.secondaryButton} onPress={pickAttachmentImages} disabled={picking || saving}>
            <Text style={styles.secondaryButtonText}>{picking ? 'Abrindo galeria...' : 'Adicionar imagem'}</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={styles.button} onPress={savePost} disabled={saving || picking}>
        <Text style={styles.buttonText}>{saving ? 'Salvando...' : 'Salvar postagem'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 18, paddingBottom: 34 },
  heading: { color: '#0f172a', fontSize: 26, fontWeight: '700', marginBottom: 18 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 14, marginBottom: 14 },
  textarea: { minHeight: 220, textAlignVertical: 'top', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 14, marginBottom: 14 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700', marginBottom: 8 },
  note: { color: '#64748b', lineHeight: 20, marginBottom: 10 },
  coverPreview: { width: '100%', height: 190, borderRadius: 10, marginVertical: 8 },
  secondaryButton: { backgroundColor: '#e2e8f0', borderRadius: 10, padding: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#1e293b', fontWeight: '700' },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  attachmentName: { flex: 1, color: '#334155' },
  removeButton: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#fee2e2' },
  removeButtonText: { color: '#b91c1c', fontWeight: '700' },
  button: { backgroundColor: '#16a34a', borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
