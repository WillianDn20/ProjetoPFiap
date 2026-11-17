import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { confirmAction, showMessage } from '../utils/dialogs';

const PAGE_SIZE = 10;
const PROTECTED_TEACHER_EMAIL = 'professor@tc4.fiap';
const BIMESTERS = [1, 2, 3, 4];
const GRADE_LEVELS = [
  '6º ano do Ensino Fundamental', '7º ano do Ensino Fundamental',
  '8º ano do Ensino Fundamental', '9º ano do Ensino Fundamental',
  '1º ano do Ensino Médio', '2º ano do Ensino Médio', '3º ano do Ensino Médio',
];
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

export default function UserManagementScreen({ navigation }) {
  const [role, setRole] = useState('teacher');
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ teacher: 0, student: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedObservations, setExpandedObservations] = useState({});
  const [observationDrafts, setObservationDrafts] = useState({});
  const [busyStudentId, setBusyStudentId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [current, teacherCount, studentCount] = await Promise.all([
        role === 'student'
          ? api.get('/students', { params: { page, limit: PAGE_SIZE } })
          : api.get('/users', { params: { role, page, limit: PAGE_SIZE } }),
        api.get('/users', { params: { role: 'teacher', page: 1, limit: 1 } }),
        api.get('/students', { params: { page: 1, limit: 1 } }),
      ]);
      setUsers(role === 'student' ? current.data.students : current.data.users);
      setPages(Math.max(current.data.pages, 1));
      setTotal(current.data.total);
      setCounts({ teacher: teacherCount.data.total, student: studentCount.data.total });
    } catch (error) {
      console.error('Unable to load users:', error);
      showMessage('Erro', error.response?.data?.error || 'Não foi possível carregar os cadastros.');
    } finally {
      setLoading(false);
    }
  }, [page, role]);

  useFocusEffect(useCallback(() => {
    loadUsers();
  }, [loadUsers]));

  const createUser = () => navigation.navigate('UserForm', { role });
  const editUser = (user) => navigation.navigate('UserForm', { role, userId: user._id, user });

  const deleteUser = (user) => {
    confirmAction(role === 'student' ? 'Excluir aluno' : 'Excluir professor', `Deseja excluir o cadastro de ${user.name}?`, async () => {
      try {
        await api.delete(`${role === 'student' ? '/students' : '/users'}/${user._id}`);
        if (users.length === 1 && page > 1) setPage((current) => current - 1);
        else setUsers((current) => current.filter((entry) => entry._id !== user._id));
        setTotal((current) => current - 1);
        setCounts((current) => ({ ...current, [role]: current[role] - 1 }));
      } catch (error) {
        showMessage('Erro', error.response?.data?.error || 'Não foi possível excluir o cadastro.');
      }
    });
  };

  const addObservation = async (student) => {
    const text = (observationDrafts[student._id] || '').trim();
    if (!text) return;
    setBusyStudentId(student._id);
    try {
      const { data } = await api.post(`/students/${student._id}/observations`, { text });
      setUsers((current) => current.map((entry) => (
        entry._id === student._id ? { ...entry, observations: data.observations } : entry
      )));
      setObservationDrafts((current) => ({ ...current, [student._id]: '' }));
    } catch (error) {
      showMessage('Erro', error.response?.data?.error || 'Não foi possível adicionar a observação.');
    } finally {
      setBusyStudentId(null);
    }
  };

  const deleteObservation = (student, observation) => {
    confirmAction('Excluir observação', 'Deseja excluir esta observação?', async () => {
      setBusyStudentId(student._id);
      try {
        const { data } = await api.delete(
          `/students/${student._id}/observations/${observation._id}`
        );
        setUsers((current) => current.map((entry) => (
          entry._id === student._id ? { ...entry, observations: data.observations } : entry
        )));
      } catch (error) {
        showMessage('Erro', error.response?.data?.error || 'Não foi possível excluir a observação.');
      } finally {
        setBusyStudentId(null);
      }
    });
  };

  const getGradeSummary = (student, subject) => {
    const scores = BIMESTERS.map((bimester) => (
      student.grades?.find((grade) => grade.subject === subject && (grade.bimester ?? 1) === bimester)?.score
    ));
    const complete = scores.every((score) => Number.isFinite(score) && score >= 0 && score <= 10);
    return {
      scores,
      average: complete ? scores.reduce((sum, score) => sum + score, 0) / BIMESTERS.length : null,
    };
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.toolbar}>
        <View style={styles.roleTabs}>
          <Pressable style={[styles.roleTab, role === 'teacher' && styles.roleTabActive]} onPress={() => {
            setRole('teacher');
            setPage(1);
            setExpandedObservations({});
          }}>
            <Text style={[styles.roleTabText, role === 'teacher' && styles.roleTabTextActive]}>Professores ({counts.teacher})</Text>
          </Pressable>
          <Pressable style={[styles.roleTab, role === 'student' && styles.roleTabActive]} onPress={() => {
            setRole('student');
            setPage(1);
            setExpandedObservations({});
          }}>
            <Text style={[styles.roleTabText, role === 'student' && styles.roleTabTextActive]}>Alunos ({counts.student})</Text>
          </Pressable>
        </View>
        <Pressable style={styles.createButton} onPress={createUser}>
          <Text style={styles.buttonText}>Criar</Text>
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listHeading}>{role === 'teacher' ? 'Professores' : 'Alunos'} ({total})</Text>
        <Text style={styles.pageText}>{page} / {pages}</Text>
      </View>
      {users.map((item) => (
        <View key={item._id} style={styles.userCard}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{role === 'student' ? item.gradeLevel : item.email}</Text>
            {role === 'student' ? (
              <>
                <Text style={styles.userEmail}>{item.address || 'Endereço não informado'}</Text>
                <Text style={styles.userEmail}>{item.guardians?.length || 0} responsável(is)</Text>
              </>
            ) : (
              <>
                <Text style={styles.userEmail}>Disciplina: {item.subject || 'Não informada'}</Text>
                {item.email?.toLowerCase() === PROTECTED_TEACHER_EMAIL && (
                  <Text style={styles.protectedAccount}>Conta protegida</Text>
                )}
              </>
            )}
          </View>
          <View style={styles.userActions}>
            {role === 'student' && (
              <>
                <Pressable style={styles.secondaryButton} onPress={() => setExpandedObservations((current) => ({
                  ...current, [item._id]: !current[item._id],
                }))}>
                  <Text style={styles.buttonText}>
                    {expandedObservations[item._id] ? 'Fechar notas e observações' : 'Ver notas e observações'}
                  </Text>
                </Pressable>
                <Pressable style={styles.editButton} onPress={() => editUser(item)}>
                  <Text style={styles.buttonText}>Editar</Text>
                </Pressable>
              </>
            )}
            {role === 'teacher' && item.email?.toLowerCase() !== PROTECTED_TEACHER_EMAIL && (
              <Pressable style={styles.editButton} onPress={() => editUser(item)}>
                <Text style={styles.buttonText}>Editar</Text>
              </Pressable>
            )}
            {!(role === 'teacher' && item.email?.toLowerCase() === PROTECTED_TEACHER_EMAIL) && (
              <Pressable style={styles.deleteButton} onPress={() => deleteUser(item)}>
                <Text style={styles.buttonText}>Excluir</Text>
              </Pressable>
            )}
          </View>
          {role === 'student' && expandedObservations[item._id] && (
            <View style={styles.observationPanel}>
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
                  {(SUBJECTS_BY_GRADE[item.gradeLevel] || []).map((subject) => {
                    const { scores, average } = getGradeSummary(item, subject);
                    return (
                      <View
                        key={subject}
                        style={[
                          styles.gradeTableRow,
                          average === null ? styles.incompleteRow : average >= 6 ? styles.passedRow : styles.failedRow,
                        ]}
                      >
                        <Text style={[styles.gradeCell, styles.subjectCell]}>{subject}</Text>
                        {scores.map((score, index) => (
                          <Text key={BIMESTERS[index]} style={styles.gradeCell}>{score ?? '—'}</Text>
                        ))}
                        <Text style={styles.gradeCell}>{average?.toFixed(1) ?? '—'}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
              <Text style={styles.sectionHeading}>Observações deste aluno</Text>
              {(item.observations || []).map((observation) => (
                <View key={observation._id} style={styles.observationItem}>
                  <Text style={styles.observationText}>
                    {observation.text}{'\n'}{new Date(observation.createdAt).toLocaleString('pt-BR')} · {observation.authorName || 'Professor'}
                  </Text>
                  <Pressable
                    style={styles.deleteObservationButton}
                    disabled={busyStudentId === item._id}
                    onPress={() => deleteObservation(item, observation)}
                  >
                    <Text style={styles.buttonText}>Excluir observação</Text>
                  </Pressable>
                </View>
              ))}
              <TextInput
                style={styles.observationInput}
                multiline
                placeholder={`Observação sobre ${item.name}`}
                value={observationDrafts[item._id] || ''}
                onChangeText={(value) => setObservationDrafts((current) => ({ ...current, [item._id]: value }))}
              />
              <Pressable
                style={styles.saveButton}
                disabled={busyStudentId === item._id || !(observationDrafts[item._id] || '').trim()}
                onPress={() => addObservation(item)}
              >
                <Text style={styles.buttonText}>{busyStudentId === item._id ? 'Salvando...' : 'Salvar observação'}</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}
      {!users.length && <Text style={styles.empty}>{loading ? 'Carregando...' : 'Nenhum cadastro nesta página.'}</Text>}
      <View style={styles.pagination}>
        <Pressable style={[styles.pageButton, page <= 1 && styles.disabled]} disabled={page <= 1} onPress={() => setPage((current) => current - 1)}>
          <Text style={styles.pageButtonText}>Anterior</Text>
        </Pressable>
        <Pressable style={[styles.pageButton, page >= pages && styles.disabled]} disabled={page >= pages} onPress={() => setPage((current) => current + 1)}>
          <Text style={styles.pageButtonText}>Próxima</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', padding: 14 },
  content: { paddingBottom: 32 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  roleTabs: { flex: 1, flexDirection: 'row', borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  roleTab: { flex: 1, minHeight: 44, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  roleTabActive: { backgroundColor: '#2563eb' },
  roleTabText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  roleTabTextActive: { color: '#fff' },
  createButton: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listHeading: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  pageText: { color: '#64748b' },
  userCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 9 },
  userInfo: { marginBottom: 10 },
  userName: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  userEmail: { color: '#64748b', marginTop: 3 },
  protectedAccount: { color: '#15803d', marginTop: 5, fontSize: 12, fontWeight: '700' },
  userActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryButton: { backgroundColor: '#64748b', borderRadius: 9, padding: 9 },
  editButton: { backgroundColor: '#d97706', borderRadius: 9, padding: 9 },
  deleteButton: { backgroundColor: '#dc2626', borderRadius: 9, padding: 9 },
  gradeTableScroll: { marginBottom: 16 },
  gradeTableRow: { flexDirection: 'row' },
  gradeCell: { width: 92, minHeight: 42, borderWidth: 1, borderColor: '#cbd5e1', padding: 8, textAlign: 'center', color: '#334155', textAlignVertical: 'center' },
  subjectCell: { width: 148, textAlign: 'left' },
  yearCell: { width: 608, minHeight: 42, borderWidth: 1, borderColor: '#cbd5e1', padding: 8, backgroundColor: '#f1f5f9', color: '#334155', fontWeight: '700', textAlign: 'center', textAlignVertical: 'center' },
  tableHeader: { backgroundColor: '#f1f5f9', fontWeight: '700' },
  incompleteRow: { backgroundColor: '#fff' },
  passedRow: { backgroundColor: '#dcfce7' },
  failedRow: { backgroundColor: '#fee2e2' },
  deleteObservationButton: { alignSelf: 'flex-start', backgroundColor: '#dc2626', borderRadius: 9, padding: 9, marginBottom: 8 },
  saveButton: { marginTop: 10, backgroundColor: '#16a34a', borderRadius: 9, padding: 10, alignItems: 'center' },
  observationPanel: { marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: '#f8fafc' },
  sectionHeading: { color: '#0f172a', fontWeight: '700', marginBottom: 8 },
  observationText: { color: '#334155', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  observationItem: { marginBottom: 8 },
  observationInput: { minHeight: 80, textAlignVertical: 'top', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginTop: 8 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 18 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  pageButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: '#2563eb' },
  pageButtonText: { color: '#fff', fontWeight: '700' },
  disabled: { backgroundColor: '#94a3b8' },
});
