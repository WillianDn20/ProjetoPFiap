import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import api from '../services/api';
import { showMessage } from '../utils/dialogs';

const GRADE_LEVELS = [
  '6º ano do Ensino Fundamental', '7º ano do Ensino Fundamental',
  '8º ano do Ensino Fundamental', '9º ano do Ensino Fundamental',
  '1º ano do Ensino Médio', '2º ano do Ensino Médio', '3º ano do Ensino Médio',
];
const BIMESTERS = [1, 2, 3, 4];
const MIDDLE_SCHOOL_SUBJECTS = [
  'Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Língua Inglesa', 'Arte', 'Educação Física',
];
const HIGH_SCHOOL_SUBJECTS = [
  'Língua Portuguesa', 'Matemática', 'Biologia', 'Física', 'Química',
  'História', 'Geografia', 'Língua Inglesa', 'Arte', 'Educação Física',
  'Filosofia', 'Sociologia',
];
const SUBJECTS_BY_GRADE = Object.fromEntries(
  GRADE_LEVELS.map((grade, index) => [grade, index < 4 ? MIDDLE_SCHOOL_SUBJECTS : HIGH_SCHOOL_SUBJECTS])
);
const TEACHER_SUBJECTS = [
  'Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Língua Inglesa', 'Arte', 'Educação Física',
  'Ensino Religioso', 'Biologia', 'Física', 'Química', 'Filosofia', 'Sociologia', 'Outro',
];
const emptyGuardian = () => ({ name: '', phone: '', email: '' });
const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
};
const getEmptyForm = (role) => role === 'student'
  ? { name: '', gradeLevel: GRADE_LEVELS[0], address: '', guardians: [emptyGuardian()] }
  : { name: '', email: '', password: '', subject: TEACHER_SUBJECTS[0] };

export default function UserFormScreen({ navigation, route }) {
  const { role = 'teacher', userId, user } = route.params || {};
  const [form, setForm] = useState(() => getEmptyForm(role));
  const [gradeDraft, setGradeDraft] = useState({});
  const [picker, setPicker] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      if (!userId) {
        setForm(getEmptyForm(role));
        setGradeDraft({});
        return;
      }
      try {
        const { data } = user
          ? { data: user }
          : await api.get(`${role === 'student' ? '/students' : '/users'}/${userId}`);
        if (!active) return;
        if (role === 'student') {
          setGradeDraft(Object.fromEntries(
            (data.grades || []).map(({ subject, score, bimester }) => [
              `${subject}:${bimester ?? 1}`,
              String(score),
            ])
          ));
        }
        setForm(role === 'student'
          ? {
              name: data.name,
              gradeLevel: data.gradeLevel,
              address: data.address || '',
              guardians: data.guardians?.length ? data.guardians.map((guardian) => ({ ...guardian })) : [emptyGuardian()],
            }
          : {
              name: data.name,
              email: data.email,
              password: '',
              subject: data.subject || 'Outro',
            });
      } catch (error) {
        if (!active) return;
        console.error('Unable to load user:', error);
        showMessage('Erro', error.response?.data?.error || 'Não foi possível carregar o cadastro.');
      }
    };
    loadUser();
    return () => { active = false; };
  }, [role, user, userId]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const getAverage = (subject) => {
    const scores = BIMESTERS.map((term) => gradeDraft[`${subject}:${term}`] ?? '');
    if (scores.some((score) => score === '')) return null;
    const parsedScores = scores.map((score) => Number(String(score).replace(',', '.')));
    if (parsedScores.some((score) => !Number.isFinite(score) || score < 0 || score > 10)) return null;
    return parsedScores.reduce((sum, score) => sum + score, 0) / BIMESTERS.length;
  };
  const setGuardianField = (index, field, value) => setForm((current) => ({
    ...current,
    guardians: current.guardians.map((guardian, guardianIndex) => (
      guardianIndex === index ? { ...guardian, [field]: value } : guardian
    )),
  }));

  const save = async () => {
    if (!form.name.trim()) {
      showMessage('Campo obrigatório', 'Informe o nome.');
      return;
    }
    if (role === 'student') {
      const activeGuardians = form.guardians.filter(({ name, phone, email }) => (
        name.trim() || phone.trim() || email.trim()
      ));
      if (!form.address.trim()) {
        showMessage('Campo obrigatório', 'O endereço é obrigatório.');
        return;
      }
      if (!activeGuardians.some(({ name, phone, email }) => (
        name.trim() && (phone.trim() || email.trim())
      ))) {
        showMessage('Responsável obrigatório', 'Informe o nome de pelo menos um responsável e um telefone ou e-mail.');
        return;
      }
      if (activeGuardians.some(({ name, phone, email }) => (
        !name.trim() || (!phone.trim() && !email.trim())
      ))) {
        showMessage('Responsável incompleto', 'Cada responsável informado precisa ter nome e telefone ou e-mail.');
        return;
      }
      if (activeGuardians.some(({ phone }) => phone && phone.replace(/\D/g, '').length !== 11)) {
        showMessage('Telefone inválido', 'O telefone deve ter 11 números, no formato (11) 111111111.');
        return;
      }
    }
    if (role === 'teacher' && (!form.email.trim() || (!userId && form.password.length < 8))) {
      showMessage('Confira os campos', userId
        ? 'Informe o e-mail e, se alterar a senha, use pelo menos 8 caracteres.'
        : 'Informe o e-mail e uma senha de pelo menos 8 caracteres.');
      return;
    }
    let gradesToSave = [];
    if (role === 'student' && userId) {
      const entries = (SUBJECTS_BY_GRADE[form.gradeLevel] || []).flatMap((subject) => (
        BIMESTERS.flatMap((bimester) => {
          const value = gradeDraft[`${subject}:${bimester}`];
          if (value === undefined || value === '') return [];
          const score = Number(String(value).replace(',', '.'));
          return Number.isFinite(score) && score >= 0 && score <= 10
            ? [{ subject, bimester, score }]
            : [{ invalid: true }];
        })
      ));
      if (entries.some((grade) => grade.invalid)) {
        showMessage('Nota inválida', 'As notas precisam estar entre 0 e 10.');
        return;
      }
      gradesToSave = entries;
    }
    const payload = role === 'student'
      ? {
          name: form.name.trim(),
          gradeLevel: form.gradeLevel,
          address: form.address.trim(),
          guardians: form.guardians.filter(({ name, phone, email }) => (
            name.trim() || phone.trim() || email.trim()
          )),
        }
      : {
          name: form.name.trim(),
          email: form.email.trim(),
          role: 'teacher',
          subject: form.subject,
          ...(form.password ? { password: form.password } : {}),
        };
    setSaving(true);
    try {
      const endpoint = role === 'student' ? '/students' : '/users';
      if (userId) {
        await api.put(`${endpoint}/${userId}`, payload);
        if (role === 'student') {
          await api.put(`/students/${userId}/grades`, { grades: gradesToSave });
        }
      }
      else {
        if (role === 'teacher') payload.password = form.password;
        await api.post(endpoint, payload);
      }
      showMessage('Concluído', userId ? 'Cadastro atualizado.' : 'Cadastro criado.');
      navigation.goBack();
    } catch (error) {
      showMessage('Erro', error.response?.data?.error || 'Não foi possível salvar o cadastro.');
    } finally {
      setSaving(false);
    }
  };

  const options = picker === 'grade' ? GRADE_LEVELS : TEACHER_SUBJECTS;
  const selectedValue = picker === 'grade' ? form.gradeLevel : form.subject;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>{userId ? 'Editar' : 'Criar'} {role === 'teacher' ? 'professor' : 'aluno'}</Text>
      <Text style={styles.fieldLabel}>Nome</Text>
      <TextInput style={styles.input} value={form.name} onChangeText={(value) => setField('name', value)} />
      {role === 'teacher' ? (
        <>
          <Text style={styles.fieldLabel}>E-mail</Text>
          <TextInput style={styles.input} value={form.email} onChangeText={(value) => setField('email', value)} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.fieldLabel}>Disciplina</Text>
          <Pressable style={styles.selectButton} onPress={() => setPicker('subject')}>
            <Text style={styles.selectText}>{form.subject}</Text><Text style={styles.selectArrow}>⌄</Text>
          </Pressable>
          <Text style={styles.fieldLabel}>{userId ? 'Nova senha (opcional)' : 'Senha (mínimo 8 caracteres)'}</Text>
          <TextInput style={styles.input} value={form.password} onChangeText={(value) => setField('password', value)} secureTextEntry />
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Ano escolar</Text>
          <Pressable style={styles.selectButton} onPress={() => setPicker('grade')}>
            <Text style={styles.selectText}>{form.gradeLevel}</Text><Text style={styles.selectArrow}>⌄</Text>
          </Pressable>
          <Text style={styles.sectionHeading}>Responsáveis</Text>
          <Text style={styles.fieldLabel}>Endereço</Text>
          <TextInput style={styles.input} value={form.address} onChangeText={(value) => setField('address', value)} />
          {form.guardians.map((guardian, index) => (
            <View key={`guardian-${index}`} style={styles.guardianCard}>
              <TextInput style={styles.input} placeholder={`Nome do responsável ${index + 1}`} value={guardian.name} onChangeText={(value) => setGuardianField(index, 'name', value)} />
              <TextInput
                style={styles.input}
                placeholder="(11) 111111111"
                value={guardian.phone}
                onChangeText={(value) => setGuardianField(index, 'phone', formatPhone(value))}
                keyboardType="phone-pad"
                maxLength={14}
              />
              <TextInput style={styles.input} placeholder="E-mail do responsável" value={guardian.email} onChangeText={(value) => setGuardianField(index, 'email', value)} keyboardType="email-address" autoCapitalize="none" />
              {form.guardians.length > 1 && (
                <Pressable style={styles.removeButton} onPress={() => setForm((current) => ({
                  ...current, guardians: current.guardians.filter((_, guardianIndex) => guardianIndex !== index),
                }))}><Text style={styles.removeText}>Remover responsável</Text></Pressable>
              )}
            </View>
          ))}
          {form.guardians.length < 5 && (
            <Pressable style={[styles.secondaryButton, styles.addGuardianButton]} onPress={() => setForm((current) => ({
              ...current, guardians: [...current.guardians, emptyGuardian()],
            }))}><Text style={styles.buttonText}>Adicionar responsável</Text></Pressable>
          )}
          {userId && (
            <>
              <Text style={styles.sectionHeading}>Notas por bimestre</Text>
              <ScrollView horizontal style={styles.gradeTableScroll}>
                <View>
                  <View style={styles.gradeTableRow}>
                    <Text style={styles.yearCell}>{new Date().getFullYear()}</Text>
                  </View>
                  <View style={styles.gradeTableRow}>
                    <Text style={[styles.gradeCell, styles.subjectCell, styles.tableHeader]}>Disciplina</Text>
                    {BIMESTERS.map((term) => <Text key={term} style={[styles.gradeCell, styles.tableHeader]}>{term}º bim.</Text>)}
                    <Text style={[styles.gradeCell, styles.tableHeader]}>Média (6,0)</Text>
                  </View>
                  {(SUBJECTS_BY_GRADE[form.gradeLevel] || []).map((subject) => {
                    const average = getAverage(subject);
                    return (
                      <View
                        key={subject}
                        style={[
                          styles.gradeTableRow,
                          average === null ? styles.incompleteRow : average >= 6 ? styles.passedRow : styles.failedRow,
                        ]}
                      >
                        <Text style={[styles.gradeCell, styles.subjectCell]}>{subject}</Text>
                        {BIMESTERS.map((term) => {
                          const key = `${subject}:${term}`;
                          return (
                            <TextInput
                              key={key}
                              style={[styles.gradeCell, styles.gradeInput]}
                              accessibilityLabel={`${subject}, ${term}º bimestre`}
                              keyboardType="decimal-pad"
                              value={gradeDraft[key] ?? ''}
                              onChangeText={(value) => setGradeDraft((current) => ({ ...current, [key]: value }))}
                            />
                          );
                        })}
                        <Text style={styles.gradeCell}>{average?.toFixed(1) ?? '—'}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}
        </>
      )}
      <View style={styles.actions}>
        <Pressable style={[styles.actionButton, styles.saveButton]} disabled={saving} onPress={save}>
          <Text style={styles.buttonText}>{saving ? 'Salvando...' : userId ? 'Salvar alterações' : 'Criar cadastro'}</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>
      <Modal visible={Boolean(picker)} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}>
          <View style={styles.picker}>
            <Text style={styles.sectionHeading}>{picker === 'grade' ? 'Selecione o ano escolar' : 'Selecione a disciplina'}</Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable key={option} style={styles.option} onPress={() => {
                  setField(picker === 'grade' ? 'gradeLevel' : 'subject', option);
                  setPicker(null);
                }}>
                  <Text style={[styles.selectText, option === selectedValue && styles.selectedOption]}>{option}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 36 },
  heading: { color: '#0f172a', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  fieldLabel: { color: '#334155', fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 11, marginBottom: 12, backgroundColor: '#fff' },
  selectButton: { width: '100%', alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: '#fff' },
  selectText: { color: '#1e293b', fontSize: 15 },
  selectArrow: { color: '#2563eb', fontSize: 20, fontWeight: '700' },
  sectionHeading: { color: '#0f172a', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  guardianCard: { padding: 10, marginBottom: 10, borderRadius: 10, backgroundColor: '#eaf0f6' },
  gradeTableScroll: { marginTop: 4, marginBottom: 12 },
  gradeTableRow: { flexDirection: 'row' },
  gradeCell: { width: 92, minHeight: 42, borderWidth: 1, borderColor: '#cbd5e1', padding: 8, textAlign: 'center', color: '#334155', textAlignVertical: 'center' },
  subjectCell: { width: 148, textAlign: 'left' },
  yearCell: { width: 608, minHeight: 42, borderWidth: 1, borderColor: '#cbd5e1', padding: 8, backgroundColor: '#f1f5f9', color: '#334155', fontWeight: '700', textAlign: 'center', textAlignVertical: 'center' },
  tableHeader: { backgroundColor: '#f1f5f9', fontWeight: '700' },
  incompleteRow: { backgroundColor: '#fff' },
  passedRow: { backgroundColor: '#dcfce7' },
  failedRow: { backgroundColor: '#fee2e2' },
  gradeInput: { backgroundColor: 'transparent' },
  removeButton: { paddingVertical: 8, alignItems: 'center' },
  removeText: { color: '#b91c1c', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#64748b', borderRadius: 10, padding: 11, alignItems: 'center', marginBottom: 12 },
  addGuardianButton: { alignSelf: 'stretch' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionButton: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  saveButton: { backgroundColor: '#16a34a' },
  cancelButton: { backgroundColor: '#64748b' },
  buttonText: { color: '#fff', fontWeight: '700' },
  cancelText: { color: '#fff', fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  picker: { maxHeight: '80%', padding: 16, borderRadius: 14, backgroundColor: '#fff' },
  option: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  selectedOption: { color: '#2563eb', fontWeight: '700' },
});
