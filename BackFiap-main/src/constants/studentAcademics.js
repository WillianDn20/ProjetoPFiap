const GRADE_LEVELS = [
  '6º ano do Ensino Fundamental',
  '7º ano do Ensino Fundamental',
  '8º ano do Ensino Fundamental',
  '9º ano do Ensino Fundamental',
  '1º ano do Ensino Médio',
  '2º ano do Ensino Médio',
  '3º ano do Ensino Médio',
];

const MIDDLE_SCHOOL_SUBJECTS = [
  'Língua Portuguesa',
  'Matemática',
  'Ciências',
  'História',
  'Geografia',
  'Língua Inglesa',
  'Arte',
  'Educação Física',
];

const HIGH_SCHOOL_SUBJECTS = [
  'Língua Portuguesa',
  'Matemática',
  'Biologia',
  'Física',
  'Química',
  'História',
  'Geografia',
  'Língua Inglesa',
  'Arte',
  'Educação Física',
  'Filosofia',
  'Sociologia',
];

const BIMESTERS = [1, 2, 3, 4];
const TEACHER_SUBJECTS = [...new Set([
  ...MIDDLE_SCHOOL_SUBJECTS,
  ...HIGH_SCHOOL_SUBJECTS,
  'Ensino Religioso',
  'Outro',
])];

const SUBJECTS_BY_GRADE = Object.fromEntries(
  GRADE_LEVELS.map((grade, index) => [
    grade,
    index < 4 ? MIDDLE_SCHOOL_SUBJECTS : HIGH_SCHOOL_SUBJECTS,
  ])
);

module.exports = { BIMESTERS, GRADE_LEVELS, SUBJECTS_BY_GRADE, TEACHER_SUBJECTS };
