import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';

const Container = styled.main`
  max-width: 760px;
  margin: 0 auto 40px;
  padding: 28px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  font-family: Arial, sans-serif;
`;
const Title = styled.h1`
  margin: 0 0 20px;
  color: #2c3e50;
`;
const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
`;
const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #334155;
  font-weight: 600;
  min-width: 0;
  ${({ $fullWidth }) => ($fullWidth ? 'grid-column: 1 / -1;' : '')}
`;
const Input = styled.input`
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
`;
const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #1e293b;
  font: inherit;
`;
const Section = styled.section`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  h2 { grid-column: 1 / -1; margin: 0; color: #334155; font-size: 1.1rem; }
`;
const GradeTable = styled.div`
  grid-column: 1 / -1;
  overflow-x: auto;
  table { width: 100%; min-width: 700px; border-collapse: collapse; }
  th, td { padding: 8px; border: 1px solid #cbd5e1; text-align: center; }
  th { background: #f1f5f9; color: #334155; }
  .year-row th { text-align: center; }
  td:first-child { text-align: left; }
  .passed td { background: #dcfce7; }
  .failed td { background: #fee2e2; }
  input { width: 64px; padding: 7px; border: 1px solid #cbd5e1; border-radius: 6px; }
`;
const GuardianFields = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
`;
const Actions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;
const Button = styled.button`
  ${({ $fullWidth }) => ($fullWidth ? 'grid-column: 1 / -1;' : '')}
  padding: 11px 16px;
  border: 0;
  border-radius: 8px;
  background: ${({ $secondary }) => ($secondary ? '#64748b' : '#16a34a')};
  color: white;
  font-weight: 700;
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: 0.6; }
`;
const ErrorMessage = styled.p`
  grid-column: 1 / -1;
  color: #b91c1c;
  margin: 0;
`;

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
const EMPTY_GUARDIAN = () => ({ name: '', phone: '', email: '' });
const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
};
const getEmptyForm = (role) => role === 'student'
  ? {
      name: '',
      gradeLevel: GRADE_LEVELS[0],
      address: '',
      guardians: [EMPTY_GUARDIAN()],
    }
  : { name: '', email: '', password: '', subject: TEACHER_SUBJECTS[0] };

function UserForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role: routeRole, id } = useParams();
  const [searchParams] = useSearchParams();
  const role = routeRole || (searchParams.get('role') === 'student' ? 'student' : 'teacher');
  const [form, setForm] = useState(() => getEmptyForm(role));
  const [gradeDraft, setGradeDraft] = useState({});
  const [errorText, setErrorText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      if (!id) {
        setForm(getEmptyForm(role));
        setGradeDraft({});
        return;
      }
      try {
        const { data } = location.state?.user
          ? { data: location.state.user }
          : await api.get(`${role === 'student' ? '/students' : '/users'}/${id}`);
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
              guardians: data.guardians?.length ? data.guardians.map((guardian) => ({ ...guardian })) : [EMPTY_GUARDIAN()],
            }
          : {
              name: data.name,
              email: data.email,
              password: '',
              subject: data.subject || 'Outro',
            });
      } catch (error) {
        if (!active) return;
        console.error('Erro ao carregar cadastro:', error);
        setErrorText(error.response?.data?.error || 'Não foi possível carregar o cadastro.');
      }
    };
    loadUser();
    return () => { active = false; };
  }, [id, location.state, role]);

  const getAverage = (subject) => {
    const scores = BIMESTERS.map((term) => gradeDraft[`${subject}:${term}`] ?? '');
    if (scores.some((score) => score === '')) return null;
    const parsedScores = scores.map((score) => Number(String(score).replace(',', '.')));
    if (parsedScores.some((score) => !Number.isFinite(score) || score < 0 || score > 10)) return null;
    return parsedScores.reduce((sum, score) => sum + score, 0) / BIMESTERS.length;
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setGuardianField = (index, field, value) => setForm((current) => ({
    ...current,
    guardians: current.guardians.map((guardian, guardianIndex) => (
      index === guardianIndex ? { ...guardian, [field]: value } : guardian
    )),
  }));

  const submit = async (event) => {
    event.preventDefault();
    setErrorText('');
    if (role === 'student') {
      const activeGuardians = form.guardians.filter(({ name, phone, email }) => (
        name.trim() || phone.trim() || email.trim()
      ));
      if (!form.address.trim()) {
        setErrorText('O endereço é obrigatório.');
        return;
      }
      if (!activeGuardians.some(({ name, phone, email }) => (
        name.trim() && (phone.trim() || email.trim())
      ))) {
        setErrorText('Informe o nome de pelo menos um responsável e um telefone ou e-mail.');
        return;
      }
      if (activeGuardians.some(({ name, phone, email }) => (
        !name.trim() || (!phone.trim() && !email.trim())
      ))) {
        setErrorText('Cada responsável informado precisa ter nome e telefone ou e-mail.');
        return;
      }
      if (activeGuardians.some(({ phone }) => phone && phone.replace(/\D/g, '').length !== 11)) {
        setErrorText('O telefone deve ter 11 números, no formato (11) 111111111.');
        return;
      }
    }
    let gradesToSave = [];
    if (role === 'student' && id) {
      gradesToSave = (SUBJECTS_BY_GRADE[form.gradeLevel] || []).flatMap((subject) => (
        BIMESTERS.flatMap((bimester) => {
          const value = gradeDraft[`${subject}:${bimester}`];
          if (value === undefined || value === '') return [];
          const score = Number(String(value).replace(',', '.'));
          if (!Number.isFinite(score) || score < 0 || score > 10) return null;
          return [{ subject, bimester, score }];
        })
      ));
      if (gradesToSave.some((grade) => grade === null)) {
        setErrorText('As notas precisam estar entre 0 e 10.');
        return;
      }
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
    if (role === 'teacher' && !id && form.password.length < 8) {
      setErrorText('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const endpoint = role === 'student' ? '/students' : '/users';
      if (id) {
        await api.put(`${endpoint}/${id}`, payload);
        if (role === 'student') {
          await api.put(`/students/${id}/grades`, { grades: gradesToSave });
        }
      }
      else {
        if (role === 'teacher') payload.password = form.password;
        await api.post(endpoint, payload);
      }
      navigate(`/usuarios?role=${role}`, { replace: true });
    } catch (error) {
      console.error('Erro ao salvar cadastro:', error);
      setErrorText(error.response?.data?.error || 'Não foi possível salvar o cadastro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container>
      <Title>{id ? 'Editar' : 'Criar'} {role === 'teacher' ? 'professor' : 'aluno'}</Title>
      <Form onSubmit={submit}>
        {errorText && <ErrorMessage role="alert">{errorText}</ErrorMessage>}
        <Field $fullWidth>
          Nome
          <Input value={form.name} onChange={(event) => setField('name', event.target.value)} required />
        </Field>
        {role === 'teacher' ? (
          <>
            <Field $fullWidth>
              E-mail
              <Input type="email" autoComplete="email" value={form.email} onChange={(event) => setField('email', event.target.value)} required />
            </Field>
            <Field $fullWidth>
              Disciplina
              <Select value={form.subject} onChange={(event) => setField('subject', event.target.value)} required>
                {TEACHER_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </Select>
            </Field>
            <Field>
              {id ? 'Nova senha (opcional)' : 'Senha (mínimo 8 caracteres)'}
              <Input type="password" minLength={form.password ? 8 : undefined} autoComplete="new-password" value={form.password} onChange={(event) => setField('password', event.target.value)} required={!id} />
            </Field>
          </>
        ) : (
          <>
            <Field $fullWidth>
              Ano escolar
              <Select required value={form.gradeLevel} onChange={(event) => setField('gradeLevel', event.target.value)}>
                {GRADE_LEVELS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </Select>
            </Field>
            <Section>
              <h2>Responsáveis</h2>
              <Field $fullWidth>
                Endereço
                <Input required value={form.address} onChange={(event) => setField('address', event.target.value)} />
              </Field>
              {form.guardians.map((guardian, index) => (
                <GuardianFields key={`guardian-${index}`}>
                  <Field>
                    Nome do responsável {index + 1}
                    <Input
                      value={guardian.name}
                      onChange={(event) => setGuardianField(index, 'name', event.target.value)}
                    />
                  </Field>
                  <Field>
                    Telefone
                    <Input
                      type="tel"
                      inputMode="tel"
                      maxLength={14}
                      placeholder="(11) 111111111"
                      value={guardian.phone}
                      onChange={(event) => setGuardianField(index, 'phone', formatPhone(event.target.value))}
                    />
                  </Field>
                  <Field>
                    E-mail do responsável
                    <Input type="email" value={guardian.email} onChange={(event) => setGuardianField(index, 'email', event.target.value)} />
                  </Field>
                  {form.guardians.length > 1 && (
                    <Button $fullWidth type="button" $secondary onClick={() => setForm((current) => ({
                      ...current, guardians: current.guardians.filter((_, guardianIndex) => guardianIndex !== index),
                    }))}>Remover responsável</Button>
                  )}
                </GuardianFields>
              ))}
              {form.guardians.length < 5 && (
                <Button $fullWidth type="button" $secondary onClick={() => setForm((current) => ({
                  ...current, guardians: [...current.guardians, EMPTY_GUARDIAN()],
                }))}>Adicionar responsável</Button>
              )}
            </Section>
            {id && (
              <Section>
                <h2>Notas por bimestre</h2>
                <GradeTable>
                  <table>
                    <thead>
                      <tr className="year-row"><th colSpan={6}>{new Date().getFullYear()}</th></tr>
                      <tr><th>Disciplina</th>{BIMESTERS.map((term) => <th key={term}>{term}º bimestre</th>)}<th>Média (aprovação: 6,0)</th></tr>
                    </thead>
                    <tbody>
                      {(SUBJECTS_BY_GRADE[form.gradeLevel] || []).map((subject) => {
                        const average = getAverage(subject);
                        return (
                          <tr key={subject} className={average === null ? '' : average >= 6 ? 'passed' : 'failed'}>
                            <td>{subject}</td>
                            {BIMESTERS.map((term) => {
                              const key = `${subject}:${term}`;
                              return (
                                <td key={key}>
                                  <input
                                    aria-label={`${subject}, ${term}º bimestre, nota`}
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={gradeDraft[key] ?? ''}
                                    onChange={(event) => setGradeDraft((current) => ({
                                      ...current, [key]: event.target.value,
                                    }))}
                                  />
                                </td>
                              );
                            })}
                            <td>{average?.toFixed(1) ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </GradeTable>
              </Section>
            )}
          </>
        )}
        <Actions>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : id ? 'Salvar alterações' : 'Criar cadastro'}</Button>
          <Button type="button" $secondary onClick={() => navigate(`/usuarios?role=${role}`)}>Cancelar</Button>
        </Actions>
      </Form>
    </Container>
  );
}

export default UserForm;
