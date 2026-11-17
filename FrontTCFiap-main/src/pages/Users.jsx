import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';

const Container = styled.main`
  max-width: 1000px;
  margin: 0 auto 40px;
  padding: 0 20px;
  font-family: Arial, sans-serif;
`;
const Title = styled.h1`
  color: #2c3e50;
  margin: 0 0 20px;
`;
const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 20px;
`;
const RoleButton = styled.button`
  padding: 10px 18px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#cbd5e1')};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? '#2563eb' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#334155')};
  font-weight: 700;
  cursor: pointer;
`;
const Button = styled.button`
  padding: 10px 16px;
  border: 0;
  border-radius: 8px;
  background: ${({ $variant }) => ($variant === 'danger' ? '#dc2626' : $variant === 'secondary' ? '#64748b' : '#16a34a')};
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: 0.6; }
`;
const CreateButton = styled(Button)`
  margin-left: auto;
`;
const Status = styled.p`
  color: #b91c1c;
  margin: 0 0 14px;
`;
const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
  h2 { color: #2c3e50; font-size: 1.2rem; }
`;
const UserCard = styled.article`
  padding: 14px 16px;
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
`;
const UserRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  @media (max-width: 560px) { align-items: flex-start; flex-direction: column; }
`;
const UserDetails = styled.div`
  min-width: 0;
  strong, span { display: block; overflow-wrap: anywhere; }
  strong { color: #1e293b; }
  span { margin-top: 4px; color: #64748b; }
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
const ObservationPanel = styled.div`
  margin-top: 14px;
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
`;
const GradeTable = styled.div`
  overflow-x: auto;
  margin-bottom: 18px;
  table { width: 100%; border-collapse: collapse; min-width: 620px; }
  th, td { padding: 8px; border: 1px solid #cbd5e1; text-align: center; }
  th { background: #f1f5f9; color: #334155; }
  td:first-child { text-align: left; }
  .passed td { background: #dcfce7; }
  .failed td { background: #fee2e2; }
  .year-row th { text-align: center; }
`;
const Observation = styled.p`
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
  white-space: pre-wrap;
`;
const TextArea = styled.textarea`
  display: block;
  width: 100%;
  min-height: 84px;
  margin: 10px 0;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
  box-sizing: border-box;
`;
const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
`;

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

function Users() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') === 'student' ? 'student' : 'teacher';
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ teacher: 0, student: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [expandedObservations, setExpandedObservations] = useState({});
  const [observationDrafts, setObservationDrafts] = useState({});
  const [busyStudentId, setBusyStudentId] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      setLoading(true);
      setErrorText('');
      try {
        const [current, teacherCount, studentCount] = await Promise.all([
          role === 'student'
            ? api.get('/students', { params: { page, limit: PAGE_SIZE } })
            : api.get('/users', { params: { role, page, limit: PAGE_SIZE } }),
          api.get('/users', { params: { role: 'teacher', page: 1, limit: 1 } }),
          api.get('/students', { params: { page: 1, limit: 1 } }),
        ]);
        if (!active) return;
        const data = current.data;
        setUsers(role === 'student' ? data.students : data.users);
        setPages(Math.max(data.pages, 1));
        setTotal(data.total);
        setCounts({ teacher: teacherCount.data.total, student: studentCount.data.total });
      } catch (error) {
        if (!active) return;
        console.error('Erro ao carregar cadastros:', error);
        setUsers([]);
        setPages(1);
        setTotal(0);
        setErrorText(error.response?.data?.error || 'Não foi possível carregar os cadastros.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchUsers();
    return () => { active = false; };
  }, [page, role]);

  const changeRole = (nextRole) => {
    setPage(1);
    setExpandedObservations({});
    navigate(`/usuarios?role=${nextRole}`);
  };

  const openForm = (user) => {
    const base = `/usuarios/${role}/${user._id}/editar`;
    navigate(base, { state: { user } });
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Deseja excluir o cadastro de ${user.name}?`)) return;
    try {
      await api.delete(`${role === 'student' ? '/students' : '/users'}/${user._id}`);
      if (users.length === 1 && page > 1) setPage((current) => current - 1);
      else setUsers((current) => current.filter((entry) => entry._id !== user._id));
      setTotal((current) => current - 1);
      setCounts((current) => ({ ...current, [role]: current[role] - 1 }));
    } catch (error) {
      console.error('Erro ao excluir cadastro:', error);
      window.alert(error.response?.data?.error || 'Não foi possível excluir o cadastro.');
    }
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
      console.error('Erro ao adicionar observação:', error);
      window.alert(error.response?.data?.error || 'Não foi possível adicionar a observação.');
    } finally {
      setBusyStudentId(null);
    }
  };

  const deleteObservation = async (student, observation) => {
    if (!window.confirm('Deseja excluir esta observação?')) return;
    setBusyStudentId(student._id);
    try {
      const { data } = await api.delete(
        `/students/${student._id}/observations/${observation._id}`
      );
      setUsers((current) => current.map((entry) => (
        entry._id === student._id ? { ...entry, observations: data.observations } : entry
      )));
    } catch (error) {
      console.error('Erro ao excluir observação:', error);
      window.alert(error.response?.data?.error || 'Não foi possível excluir a observação.');
    } finally {
      setBusyStudentId(null);
    }
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
    <Container>
      <Title>Gerenciar usuários</Title>
      <Toolbar aria-label="Tipo de cadastro">
        <RoleButton type="button" $active={role === 'teacher'} onClick={() => changeRole('teacher')}>
          Professores ({counts.teacher})
        </RoleButton>
        <RoleButton type="button" $active={role === 'student'} onClick={() => changeRole('student')}>
          Alunos ({counts.student})
        </RoleButton>
        <CreateButton type="button" onClick={() => navigate(`/usuarios/novo?role=${role}`)}>
          Criar {role === 'teacher' ? 'professor' : 'aluno'}
        </CreateButton>
      </Toolbar>
      {errorText && <Status role="alert">{errorText}</Status>}
      <ListHeader>
        <h2>{role === 'teacher' ? 'Professores' : 'Alunos'} ({total})</h2>
        <span>{page} / {pages}</span>
      </ListHeader>
      {loading && users.length === 0 && <p>Carregando cadastros...</p>}
      {!loading && users.length === 0 && <p>Nenhum cadastro nesta categoria.</p>}
      {users.map((user) => (
        <UserCard key={user._id}>
          <UserRow>
            <UserDetails>
              <strong>{user.name}</strong>
              {role === 'student' ? (
                <>
                  <span>{user.gradeLevel}</span>
                  <span>{user.address || 'Endereço não informado'}</span>
                  <span>{user.guardians?.length || 0} responsável(is)</span>
                </>
              ) : (
                <>
                  <span>{user.email}</span>
                  <span>Disciplina: {user.subject || 'Não informada'}</span>
                  {user.email?.toLowerCase() === PROTECTED_TEACHER_EMAIL && (
                    <span>Conta protegida</span>
                  )}
                </>
              )}
            </UserDetails>
            <Actions>
              {role === 'student' && (
                <>
                  <Button type="button" $variant="secondary" onClick={() => setExpandedObservations((current) => ({
                    ...current, [user._id]: !current[user._id],
                  }))}>
                    {expandedObservations[user._id] ? 'Fechar notas e observações' : 'Ver notas e observações'}
                  </Button>
                  <Button type="button" $variant="secondary" onClick={() => openForm(user)}>
                    Editar
                  </Button>
                </>
              )}
              {role === 'teacher' && user.email?.toLowerCase() !== PROTECTED_TEACHER_EMAIL && (
                <Button type="button" $variant="secondary" onClick={() => openForm(user)}>Editar</Button>
              )}
              {!(role === 'teacher' && user.email?.toLowerCase() === PROTECTED_TEACHER_EMAIL) && (
                <Button type="button" $variant="danger" onClick={() => deleteUser(user)}>Excluir</Button>
              )}
            </Actions>
          </UserRow>
          {role === 'student' && expandedObservations[user._id] && (
            <ObservationPanel>
              <strong>Notas por bimestre</strong>
              <GradeTable>
                <table>
                  <thead>
                    <tr className="year-row"><th colSpan={6}>{new Date().getFullYear()}</th></tr>
                    <tr><th>Disciplina</th>{BIMESTERS.map((term) => <th key={term}>{term}º bimestre</th>)}<th>Média (aprovação: 6,0)</th></tr>
                  </thead>
                  <tbody>
                    {(SUBJECTS_BY_GRADE[user.gradeLevel] || []).map((subject) => {
                      const { scores, average } = getGradeSummary(user, subject);
                      return (
                        <tr key={subject} className={average === null ? '' : average >= 6 ? 'passed' : 'failed'}>
                          <td>{subject}</td>
                          {scores.map((score, index) => <td key={BIMESTERS[index]}>{score ?? '—'}</td>)}
                          <td>{average?.toFixed(1) ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </GradeTable>
              <strong>Observações deste aluno</strong>
              {(user.observations || []).map((observation) => (
                <Observation key={observation._id}>
                  {observation.text}
                  <br />
                  <small>{new Date(observation.createdAt).toLocaleString('pt-BR')} · {observation.authorName || 'Professor'}</small>
                  <br />
                  <Button
                    type="button"
                    $variant="danger"
                    disabled={busyStudentId === user._id}
                    onClick={() => deleteObservation(user, observation)}
                  >
                    Excluir observação
                  </Button>
                </Observation>
              ))}
              <TextArea
                aria-label={`Nova observação para ${user.name}`}
                value={observationDrafts[user._id] || ''}
                onChange={(event) => setObservationDrafts((current) => ({
                  ...current, [user._id]: event.target.value,
                }))}
                placeholder="Escreva uma observação sobre este aluno"
              />
              <Button
                type="button"
                disabled={busyStudentId === user._id || !(observationDrafts[user._id] || '').trim()}
                onClick={() => addObservation(user)}
              >
                {busyStudentId === user._id ? 'Salvando...' : 'Salvar observação'}
              </Button>
            </ObservationPanel>
          )}
        </UserCard>
      ))}
      <Pagination>
        <Button type="button" $variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>
          Anterior
        </Button>
        <Button type="button" $variant="secondary" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)}>
          Próxima
        </Button>
      </Pagination>
    </Container>
  );
}

export default Users;
