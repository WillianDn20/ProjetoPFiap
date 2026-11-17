import { useContext, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { showMessage } from '../utils/dialogs';

export default function LoginScreen({ navigation }) {
  const { signIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showMessage('Campos obrigatórios', 'Informe e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/login', { email: email.trim(), password });
      if (data.role !== 'teacher') {
        showMessage('Acesso indisponível', 'O painel administrativo é exclusivo para professores.');
        return;
      }

      await signIn({
        token: data.token,
        user: { name: data.name, email: data.email, role: data.role },
      });
      navigation.goBack();
    } catch (error) {
      showMessage('Não foi possível entrar', error.response?.data?.error || 'Verifique sua conexão e suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Acesso de professor</Text>
        <Text style={styles.subtitle}>Entre para criar e administrar postagens.</Text>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <Pressable style={styles.primary} onPress={handleLogin} disabled={loading}>
          <Text style={styles.primaryText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 22, backgroundColor: '#f8fafc' },
  card: { padding: 22, borderRadius: 18, backgroundColor: '#fff' },
  title: { color: '#0f172a', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 22 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 13, marginBottom: 14, fontSize: 16 },
  primary: { backgroundColor: '#2563eb', padding: 14, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
