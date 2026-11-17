import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import api from '../services/api';
import { showMessage } from '../utils/dialogs';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || password.length < 8 || !registrationCode.trim()) {
      showMessage('Confira os campos', 'Preencha todos os campos; a senha deve ter ao menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/register', { name: name.trim(), email: email.trim(), password, registrationCode });
      showMessage('Cadastro concluído', 'Agora entre com seu e-mail e senha.', () => navigation.goBack());
    } catch (error) {
      showMessage('Não foi possível cadastrar', error.response?.data?.error || 'Verifique sua conexão e os dados informados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Cadastro de professor</Text>
        <TextInput style={styles.input} placeholder="Nome completo" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput style={styles.input} placeholder="Senha (mínimo 8 caracteres)" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Código de convite" value={registrationCode} onChangeText={setRegistrationCode} secureTextEntry />
        <Pressable style={styles.primary} onPress={handleRegister} disabled={loading}>
          <Text style={styles.primaryText}>{loading ? 'Cadastrando...' : 'Cadastrar'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 22, backgroundColor: '#f8fafc' },
  card: { padding: 22, borderRadius: 18, backgroundColor: '#fff' },
  title: { color: '#0f172a', fontSize: 25, fontWeight: '700', textAlign: 'center', marginBottom: 22 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 13, marginBottom: 14, fontSize: 16 },
  primary: { backgroundColor: '#16a34a', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
