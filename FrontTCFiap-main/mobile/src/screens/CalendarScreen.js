import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { confirmAction, showMessage } from '../utils/dialogs';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const eventDateKey = (dateString) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function CalendarScreen() {
  const { isTeacher } = useContext(AuthContext);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [title, setTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(() => dateKey(new Date()));
  const [loading, setLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch (error) {
      console.error('Unable to load calendar events:', error);
      showMessage('Erro', error.response?.data?.error || 'Não foi possível carregar o calendário.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadEvents();
  }, [loadEvents]));

  useEffect(() => {
    let active = true;
    const year = monthDate.getFullYear();

    fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`BrasilAPI returned HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (active) setHolidays(data);
      })
      .catch((error) => {
        console.error('Unable to load national holidays:', error);
        if (active) {
          showMessage('Aviso', 'Não foi possível carregar os feriados nacionais.');
        }
      });

    return () => {
      active = false;
    };
  }, [monthDate]);

  const calendarItems = useMemo(() => [
    ...events,
    ...holidays.map((holiday) => ({
      _id: `holiday-${holiday.date}`,
      title: holiday.name,
      date: `${holiday.date}T12:00:00`,
      isHoliday: true,
    })),
  ], [events, holidays]);

  const firstWeekday = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const calendarDays = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const selectedEvents = calendarItems.filter((event) => eventDateKey(event.date) === dateKey(selectedDate));
  const moveMonth = (offset) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const addEvent = async () => {
    if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(newEventDate)) {
      showMessage('Dados inválidos', 'Informe o nome do evento e uma data no formato AAAA-MM-DD.');
      return;
    }

    const [year, month, day] = newEventDate.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      showMessage('Data inválida', 'Confira a data informada.');
      return;
    }

    try {
      await api.post('/events', { title: title.trim(), date: date.toISOString() });
      setTitle('');
      setSelectedDate(date);
      setMonthDate(new Date(year, month - 1, 1));
      await loadEvents();
    } catch (error) {
      showMessage('Erro', error.response?.data?.error || 'Não foi possível criar o evento.');
    }
  };

  const deleteEvent = (event) => {
    confirmAction('Excluir evento', `Deseja excluir "${event.title}"?`, async () => {
      try {
        await api.delete(`/events/${event._id}`);
        await loadEvents();
      } catch (error) {
        showMessage('Erro', error.response?.data?.error || 'Não foi possível excluir o evento.');
      }
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.calendar}>
        <View style={styles.monthHeader}>
          <Pressable style={styles.monthButton} onPress={() => moveMonth(-1)}>
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}</Text>
          <Pressable style={styles.monthButton} onPress={() => moveMonth(1)}>
            <Text style={styles.monthButtonText}>›</Text>
          </Pressable>
        </View>
        <View style={styles.grid}>
          {WEEKDAYS.map((day, index) => (
            <Text key={`weekday-${index}`} style={styles.weekday}>{day}</Text>
          ))}
          {calendarDays.map((day, index) => {
            const date = day ? new Date(monthDate.getFullYear(), monthDate.getMonth(), day) : null;
            const isSelected = date && dateKey(date) === dateKey(selectedDate);
            const hasEvent = date && calendarItems.some((event) => eventDateKey(event.date) === dateKey(date));
            return (
              <Pressable
                key={`day-${index}`}
                style={[styles.day, isSelected && styles.daySelected]}
                disabled={!day}
                onPress={() => {
                  setSelectedDate(date);
                  setNewEventDate(dateKey(date));
                }}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day || ''}</Text>
                {hasEvent && <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {isTeacher && (
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Adicionar evento</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do evento"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Data (AAAA-MM-DD)"
            value={newEventDate}
            onChangeText={setNewEventDate}
            autoCapitalize="none"
          />
          <Pressable style={styles.addButton} onPress={addEvent}>
            <Text style={styles.buttonText}>Adicionar evento</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        Eventos de {selectedDate.toLocaleDateString('pt-BR')}
      </Text>
      <FlatList
        data={selectedEvents}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={loadEvents}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.eventCard, item.isHoliday && styles.holidayCard]}>
            <Text style={styles.eventTitle}>
              {item.title}{item.isHoliday ? ' · Feriado nacional' : ''}
            </Text>
            <Text style={styles.eventDate}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
            {isTeacher && !item.isHoliday && (
              <Pressable onPress={() => deleteEvent(item)}>
                <Text style={styles.deleteText}>Excluir</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Carregando eventos...' : 'Nenhum evento para este dia.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  calendar: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  monthButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthButtonText: { color: '#2563eb', fontSize: 28, fontWeight: '700' },
  monthTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: '#64748b', fontWeight: '700', paddingVertical: 8 },
  day: { width: '14.2857%', minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  daySelected: { backgroundColor: '#2563eb' },
  dayText: { color: '#1e293b' },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  eventDot: { position: 'absolute', bottom: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: '#f59e0b' },
  eventDotSelected: { backgroundColor: '#fff' },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: '#fff' },
  addButton: { backgroundColor: '#16a34a', borderRadius: 10, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  list: { paddingBottom: 24 },
  eventCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  holidayCard: { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  eventTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  eventDate: { color: '#64748b', marginTop: 4, marginBottom: 8 },
  deleteText: { color: '#dc2626', fontWeight: '700' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 12 },
});
