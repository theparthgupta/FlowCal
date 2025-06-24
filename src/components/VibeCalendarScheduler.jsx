import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Settings,
  Globe,
  Video,
  MapPin,
  Moon,
  Sun
} from 'lucide-react';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

export default function VibeCalendarScheduler({
  events: initialEvents = [],
  timezones = Intl.supportedValuesOf('timeZone'),
  eventTypes = [
    { value: 'meeting', label: 'Meeting', color: 'bg-blue-500' },
    { value: 'call',    label: 'Call',    color: 'bg-green-500' },
    { value: 'review',  label: 'Review',  color: 'bg-purple-500' },
    { value: 'focus',   label: 'Focus',   color: 'bg-orange-500' },
    { value: 'break',   label: 'Break',   color: 'bg-gray-500' },
  ],
  onEventAdd = null,
}) {
  const [events, setEvents] = useState(initialEvents);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: dayjs().format('YYYY-MM-DD'),
    time: dayjs().format('HH:mm'),
    duration: 60,
    timezone: dayjs.tz.guess(),
    type: (eventTypes && eventTypes.length > 0 ? eventTypes[0].value : ''),
    attendees: [],
    location: '',
    buffer: 15,
    description: '',
    repeat: 'none',
    reminder: 0,
  });
  const [conflicts, setConflicts] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [editEventId, setEditEventId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'month', 'week', or 'day'
  const [selectedDay, setSelectedDay] = useState(null);
  const [weekStart, setWeekStart] = useState(dayjs(newEvent.date).startOf('week'));
  const [dayViewDate, setDayViewDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reminders, setReminders] = useState([]); // [{event, message, id}]
  const reminderOptions = [
    { value: 0, label: 'No reminder' },
    { value: 5, label: '5 minutes before' },
    { value: 10, label: '10 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
  ];
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  // Utility: get work window for a date
  const getWorkWindow = (date) => ({
    start: dayjs.tz(date, newEvent.timezone).hour(9).minute(0),
    end: dayjs.tz(date, newEvent.timezone).hour(17).minute(0)
  });

  const checkConflicts = (testEvent, list) => {
    const conflictsList = [];
    const start = dayjs.tz(`${testEvent.date}T${testEvent.time}`, testEvent.timezone);
    const end = start.add(testEvent.duration + testEvent.buffer, 'minute');

    list.forEach(evt => {
      if (evt.id === testEvent.id) return;
      const eStart = dayjs.tz(`${evt.date}T${evt.time}`, evt.timezone);
      const eEnd = eStart.add(evt.duration + (evt.buffer || 15), 'minute');
      if (start.isBefore(eEnd) && end.isAfter(eStart)) {
        conflictsList.push({ conflictWith: evt.title });
      }
    });
    return conflictsList;
  };

  const generateAvailabilities = useCallback((date) => {
    const slots = [];
    const { start, end } = getWorkWindow(date);
    let cursor = start;
    while (cursor.add(newEvent.duration, 'minute').isBefore(end) || cursor.add(newEvent.duration, 'minute').isSame(end)) {
      const test = {
        date,
        time: cursor.format('HH:mm'),
        duration: newEvent.duration,
        buffer: newEvent.buffer,
        timezone: newEvent.timezone
      };
      if (!checkConflicts(test, events).length) {
        slots.push(cursor.format('HH:mm'));
      }
      cursor = cursor.add(30, 'minute');
      if (slots.length >= 6) break;
    }
    return slots;
  }, [events, newEvent.duration, newEvent.buffer, newEvent.timezone, getWorkWindow, checkConflicts, newEvent]);

  const handleEdit = (event) => {
    setEditEventId(event.id);
    setShowForm(true);
    setNewEvent({ ...event });
    setConflicts([]);
    setAvailabilities(generateAvailabilities(event.date));
  };

  const handleDelete = (event) => {
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
    setShowDeleteConfirm(false);
    setEventToDelete(null);
    if (editEventId === eventToDelete.id) {
      setShowForm(false);
      setEditEventId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setEventToDelete(null);
  };

  const handleAdd = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) return;
    const errs = checkConflicts(newEvent, events.filter(e => e.id !== editEventId));
    if (errs.length) {
      setConflicts(errs);
      return;
    }
    if (editEventId) {
      // Edit existing event
      setEvents(prev => prev.map(e => e.id === editEventId ? { ...newEvent, id: editEventId } : e));
      setEditEventId(null);
    } else {
      // Add new event
      const toAdd = { ...newEvent, id: Date.now(), status: 'confirmed' };
      let newEvents = [toAdd];
      if (newEvent.repeat !== 'none') {
        let base = dayjs.tz(`${newEvent.date}T${newEvent.time}`, newEvent.timezone);
        for (let i = 1; i <= 5; i++) {
          let nextDate;
          if (newEvent.repeat === 'daily') nextDate = base.add(i, 'day');
          if (newEvent.repeat === 'weekly') nextDate = base.add(i, 'week');
          if (newEvent.repeat === 'monthly') nextDate = base.add(i, 'month');
          if (nextDate) {
            newEvents.push({ ...toAdd, id: Date.now() + i, date: nextDate.format('YYYY-MM-DD') });
          }
        }
      }
      setEvents(prev => [...prev, ...newEvents]);
      onEventAdd && onEventAdd(toAdd);
    }
    setShowForm(false);
    setNewEvent(prev => ({ ...prev, title: '', attendees: [] }));
    setConflicts([]);
    setAttendeeInput('');
  };

  useEffect(() => {
    if (newEvent.date) {
      setAvailabilities(generateAvailabilities(newEvent.date));
    }
  }, [newEvent.date, events, generateAvailabilities]);

  // Reminder notification logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = dayjs();
      events.forEach(event => {
        if (!event.reminder || event.reminder === 0) return;
        const eventTime = dayjs.tz(`${event.date}T${event.time}`, event.timezone);
        const remindAt = eventTime.subtract(event.reminder, 'minute');
        // Only remind if within the last minute and not already reminded
        if (
          now.isAfter(remindAt) &&
          now.isBefore(eventTime) &&
          !reminders.some(r => r.id === event.id && r.message === remindAt.format())
        ) {
          setReminders(prev => [
            ...prev,
            {
              id: event.id,
              message: remindAt.format(),
              event,
              text: `Reminder: "${event.title}" at ${event.time} (${event.date}) in ${event.reminder} min`,
            },
          ]);
        }
      });
    }, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [events, reminders]);

  const dismissReminder = (id, message) => {
    setReminders(prev => prev.filter(r => !(r.id === id && r.message === message)));
  };

  // Helper to get all days in current month
  const getMonthDays = (dateStr) => {
    const date = dayjs(dateStr);
    const startOfMonth = date.startOf('month');
    const endOfMonth = date.endOf('month');
    const startDay = startOfMonth.day(); // 0 (Sun) - 6 (Sat)
    const days = [];
    // Fill leading empty days
    for (let i = 0; i < startDay; i++) days.push(null);
    // Fill days of month
    for (let d = 1; d <= endOfMonth.date(); d++) {
      days.push(startOfMonth.date(d));
    }
    // Fill trailing empty days
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  // Helper to get all days in current week
  const getWeekDays = (start) => {
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  };

  return (
    <div className={`max-w-6xl mx-auto p-2 sm:p-4 md:p-6 min-h-screen animate-fadein ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100'}`}>
      <div className={`rounded-3xl shadow-2xl p-2 sm:p-4 md:p-10 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white/80 backdrop-blur-md border-purple-100'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-10 gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg animate-bounce-slow">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">
                Vibe Calendar Scheduler
              </h1>
              <p className="text-gray-500 font-medium mt-1">Smart scheduling with conflict detection & timezone magic</p>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => setIsDark(d => !d)}
              className={`p-2 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${isDark ? 'bg-gray-700 border-gray-600 text-yellow-300' : 'bg-white border-purple-200 text-purple-700'} hover:scale-110`}
              title="Toggle dark mode"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label="New Event"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Event</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-xl font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-200'}`}
            onClick={() => setViewMode('list')}
            aria-label="List View"
          >
            List View
          </button>
          <button
            className={`px-4 py-2 rounded-xl font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${viewMode === 'month' ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-200'}`}
            onClick={() => setViewMode('month')}
            aria-label="Month View"
          >
            Month View
          </button>
          <button
            className={`px-4 py-2 rounded-xl font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${viewMode === 'week' ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-200'}`}
            onClick={() => setViewMode('week')}
            aria-label="Week View"
          >
            Week View
          </button>
          <button
            className={`px-4 py-2 rounded-xl font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${viewMode === 'day' ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-200'}`}
            onClick={() => setViewMode('day')}
            aria-label="Day View"
          >
            Day View
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="bg-gradient-to-r from-blue-400 to-blue-600 p-7 rounded-2xl text-white shadow-lg hover:scale-105 transition-transform duration-200 cursor-pointer relative overflow-hidden">
            <div className="absolute right-2 top-2 opacity-10 text-7xl"><Calendar /></div>
            <div className="flex items-center justify-between z-10 relative">
              <div>
                <p className="text-blue-100">Today's Events</p>
                <p className="text-3xl font-extrabold tracking-tight">{events.filter(e => e.date === dayjs().format('YYYY-MM-DD')).length}</p>
              </div>
              <Calendar className="w-9 h-9 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-400 to-green-600 p-7 rounded-2xl text-white shadow-lg hover:scale-105 transition-transform duration-200 cursor-pointer relative overflow-hidden">
            <div className="absolute right-2 top-2 opacity-10 text-7xl"><CheckCircle /></div>
            <div className="flex items-center justify-between z-10 relative">
              <div>
                <p className="text-green-100">Confirmed</p>
                <p className="text-3xl font-extrabold tracking-tight">{events.filter(e => e.status === 'confirmed').length}</p>
              </div>
              <CheckCircle className="w-9 h-9 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-400 to-orange-600 p-7 rounded-2xl text-white shadow-lg hover:scale-105 transition-transform duration-200 cursor-pointer relative overflow-hidden">
            <div className="absolute right-2 top-2 opacity-10 text-7xl"><Clock /></div>
            <div className="flex items-center justify-between z-10 relative">
              <div>
                <p className="text-orange-100">Pending</p>
                <p className="text-3xl font-extrabold tracking-tight">{events.filter(e => e.status === 'pending').length}</p>
              </div>
              <Clock className="w-9 h-9 text-orange-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-400 to-pink-500 p-7 rounded-2xl text-white shadow-lg hover:scale-105 transition-transform duration-200 cursor-pointer relative overflow-hidden">
            <div className="absolute right-2 top-2 opacity-10 text-7xl"><AlertCircle /></div>
            <div className="flex items-center justify-between z-10 relative">
              <div>
                <p className="text-purple-100">Conflicts</p>
                <p className="text-3xl font-extrabold tracking-tight">{conflicts.length}</p>
              </div>
              <AlertCircle className="w-9 h-9 text-purple-200" />
            </div>
          </div>
        </div>

        {/* New Event Form */}
        {showForm && (
          <div className="bg-white/90 rounded-2xl p-8 mb-10 border-2 border-dashed border-purple-200 shadow-xl animate-fadein">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
                {editEventId ? <Settings className="w-6 h-6 text-purple-400" /> : <Plus className="w-6 h-6 text-purple-400" />}
                {editEventId ? 'Edit Event' : 'Schedule New Event'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditEventId(null); }} className="text-gray-400 hover:text-purple-600 transition-colors">
                <X className="w-7 h-7" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Title */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Title</label>
                <input
                  type="text"
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                />
                <span className="absolute right-3 top-8 text-purple-300"><Calendar className="w-5 h-5" /></span>
              </div>
              {/* Type */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Type</label>
                <select
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                  value={newEvent.type}
                  onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-8 text-purple-300"><Settings className="w-5 h-5" /></span>
              </div>
              {/* Date */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                  value={newEvent.date}
                  onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                />
                <span className="absolute right-3 top-8 text-purple-300"><Calendar className="w-5 h-5" /></span>
              </div>
              {/* Time */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Time</label>
                <input
                  type="time"
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                  value={newEvent.time}
                  onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                />
                <span className="absolute right-3 top-8 text-purple-300"><Clock className="w-5 h-5" /></span>
              </div>
              {/* Duration */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Duration (min)</label>
                <input
                  type="number"
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                  value={newEvent.duration}
                  min={1}
                  onChange={e => setNewEvent({ ...newEvent, duration: Number(e.target.value) })}
                />
                <span className="absolute right-3 top-8 text-purple-300"><Clock className="w-5 h-5" /></span>
              </div>
              {/* Timezone */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Timezone</label>
                <select
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                  value={newEvent.timezone}
                  onChange={e => setNewEvent({ ...newEvent, timezone: e.target.value })}
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-8 text-purple-300"><Globe className="w-5 h-5" /></span>
              </div>
              {/* Location */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                  value={newEvent.location}
                  onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="e.g. Zoom, Google Meet, Office"
                />
                <span className="absolute right-3 top-8 text-purple-300">{(newEvent.location.includes('Zoom') || newEvent.location.includes('Meet')) ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}</span>
              </div>
              {/* Attendees */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Attendees</label>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 border-2 border-purple-200 rounded-l-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                    value={attendeeInput}
                    onChange={e => setAttendeeInput(e.target.value)}
                    placeholder="Add attendee email"
                  />
                  <button
                    type="button"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2 rounded-r-xl hover:from-blue-600 hover:to-pink-500 transition-all font-semibold"
                    onClick={() => {
                      if (attendeeInput.trim()) {
                        setNewEvent({ ...newEvent, attendees: [...newEvent.attendees, attendeeInput.trim()] });
                        setAttendeeInput('');
                      }
                    }}
                  >Add</button>
                </div>
                {newEvent.attendees.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    {newEvent.attendees.map((a, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-purple-50 rounded px-2 py-1">
                        <span className="flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" />{a}</span>
                        <button
                          type="button"
                          className="ml-2 text-red-400 hover:text-red-700 font-bold"
                          onClick={() => setNewEvent({ ...newEvent, attendees: newEvent.attendees.filter((_, i) => i !== idx) })}
                        >Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Description/Notes */}
              <div className="md:col-span-2 relative">
                <label className="block text-gray-700 font-semibold mb-1">Description / Notes</label>
                <textarea
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm min-h-[60px]"
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Add any notes or details about the event..."
                />
              </div>
              {/* Repeat/Recurrence */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Repeat</label>
                <select
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                  value={newEvent.repeat}
                  onChange={e => setNewEvent({ ...newEvent, repeat: e.target.value })}
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {/* Remind me */}
              <div className="relative">
                <label className="block text-gray-700 font-semibold mb-1">Remind me</label>
                <select
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all shadow-sm"
                  value={newEvent.reminder}
                  onChange={e => setNewEvent({ ...newEvent, reminder: Number(e.target.value) })}
                >
                  {reminderOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Availabilities & Conflicts & Action Buttons */}
            <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <span className="block text-gray-700 font-semibold mb-2">Available Times:</span>
                <div className="flex flex-wrap gap-2">
                  {availabilities.length > 0 ? availabilities.map(time => (
                    <button
                      key={time}
                      type="button"
                      className={`px-4 py-2 rounded-xl border-2 font-semibold shadow-sm transition-all duration-150 ${time === newEvent.time ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-blue-400 scale-105' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50 hover:scale-105'}`}
                      onClick={() => setNewEvent({ ...newEvent, time })}
                    >
                      {time}
                    </button>
                  )) : <span className="text-gray-400">No available slots</span>}
                </div>
              </div>
              <div>
                {conflicts.length > 0 && (
                  <div className="text-red-500 font-semibold flex items-center gap-2 animate-pulse">
                    <AlertCircle className="w-5 h-5" />
                    <span>Conflicts with: {conflicts.map(c => c.conflictWith).join(', ')}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                <button
                  onClick={handleAdd}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-2 rounded-2xl hover:from-blue-600 hover:to-pink-500 transition-all duration-200 shadow-lg font-bold text-lg"
                >
                  <CheckCircle className="w-5 h-5 inline-block mr-2" />{editEventId ? 'Update Event' : 'Add Event'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-100 text-gray-700 px-8 py-2 rounded-2xl hover:bg-gray-200 font-semibold text-lg shadow"
                >
                  <X className="w-5 h-5 inline-block mr-2" />Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 animate-fadein">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-8 shadow-2xl border-2 border-purple-200 dark:border-gray-700 max-w-[90vw] w-full sm:w-auto">
              <h3 className="text-xl font-bold text-red-600 mb-4">Delete Event?</h3>
              <p className="mb-6">Are you sure you want to delete <span className="font-semibold">{eventToDelete?.title}</span>?</p>
              <div className="flex gap-4 justify-end flex-wrap">
                <button onClick={confirmDelete} className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">Delete</button>
                <button onClick={cancelDelete} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Month Grid View */}
        {viewMode === 'month' && (
          <div className="bg-white/90 rounded-2xl p-6 mb-10 border-2 border-purple-100 shadow-xl animate-fadein">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-purple-700 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" />{dayjs(newEvent.date).format('MMMM YYYY')}</h3>
              {/* Optionally add month navigation here */}
            </div>
            <div className="grid grid-cols-7 gap-2 text-center font-semibold text-purple-600 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {getMonthDays(newEvent.date).map((d, idx) => (
                <div key={idx} className={`min-h-[80px] rounded-xl p-2 border-2 ${d ? 'bg-purple-50 border-purple-200 hover:bg-purple-100 cursor-pointer' : 'bg-transparent border-transparent'} transition-all relative`} onClick={() => d && setSelectedDay(d.format('YYYY-MM-DD'))}>
                  <div className={`text-xs font-bold ${d && d.isSame(dayjs(), 'day') ? 'text-pink-500' : 'text-purple-400'}`}>{d ? d.date() : ''}</div>
                  {/* Show events for this day */}
                  {d && events.filter(e => e.date === d.format('YYYY-MM-DD')).slice(0,2).map(e => (
                    <div key={e.id} className="mt-1 px-2 py-1 rounded bg-purple-200 text-purple-900 text-xs truncate font-semibold shadow-sm">{e.title}</div>
                  ))}
                  {d && events.filter(e => e.date === d.format('YYYY-MM-DD')).length > 2 && (
                    <div className="text-xs text-purple-400 mt-1">+{events.filter(e => e.date === d.format('YYYY-MM-DD')).length - 2} more</div>
                  )}
                </div>
              ))}
            </div>
            {/* Popup for selected day */}
            {selectedDay && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 animate-fadein">
                <div className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-purple-200 min-w-[320px] max-w-[90vw]">
                  <h4 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" />Events on {dayjs(selectedDay).format('MMMM D, YYYY')}</h4>
                  <button className="absolute top-3 right-3 text-gray-400 hover:text-purple-600" onClick={() => setSelectedDay(null)}><X className="w-6 h-6" /></button>
                  <div className="space-y-3">
                    {events.filter(e => e.date === selectedDay).length === 0 && <div className="text-gray-400">No events</div>}
                    {events.filter(e => e.date === selectedDay).map(e => (
                      <div key={e.id} className="p-3 rounded-xl border border-purple-100 bg-purple-50">
                        <div className="font-bold text-purple-700">{e.title}</div>
                        <div className="text-xs text-gray-500">{e.time} ({e.duration}min)</div>
                        {e.description && <div className="text-xs text-gray-500 mt-1 italic">{e.description}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Week Grid View */}
        {viewMode === 'week' && (
          <div className="bg-white/90 dark:bg-gray-800 rounded-2xl p-2 sm:p-6 mb-10 border-2 border-purple-100 dark:border-gray-700 shadow-xl animate-fadein overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" />Week of {weekStart.format('MMMM D, YYYY')}</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded bg-purple-100 dark:bg-gray-700 text-purple-700 dark:text-purple-200 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400" onClick={() => setWeekStart(weekStart.subtract(1, 'week'))} aria-label="Previous week">&lt;</button>
                <button className="px-3 py-1 rounded bg-purple-100 dark:bg-gray-700 text-purple-700 dark:text-purple-200 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400" onClick={() => setWeekStart(weekStart.add(1, 'week'))} aria-label="Next week">&gt;</button>
              </div>
            </div>
            <div className="grid grid-cols-8 gap-1 text-xs font-semibold text-purple-600 dark:text-purple-200 mb-2 min-w-[700px]">
              <div className="text-right pr-2">Time</div>
              {getWeekDays(weekStart).map(d => <div key={d.format('YYYY-MM-DD')} className="text-center">{d.format('ddd D')}</div>)}
            </div>
            <div className="grid grid-cols-8 gap-1 min-w-[700px]">
              {/* Time slots: 8am to 8pm */}
              {Array.from({ length: 13 }, (_, i) => 8 + i).map(hour => (
                <React.Fragment key={hour}>
                  <div className="text-right pr-2 py-2 text-xs text-gray-400">{dayjs().hour(hour).minute(0).format('hA')}</div>
                  {getWeekDays(weekStart).map(day => {
                    const slotEvents = events.filter(e =>
                      e.date === day.format('YYYY-MM-DD') &&
                      parseInt(e.time.split(':')[0], 10) === hour
                    );
                    return (
                      <div key={day.format('YYYY-MM-DD') + hour} className="min-h-[40px] relative">
                        {slotEvents.map(e => (
                          <div key={e.id} className="absolute left-0 right-0 top-0 px-2 py-1 rounded bg-purple-200 text-purple-900 text-xs truncate font-semibold shadow-sm border border-purple-300">
                            {e.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="bg-white/90 rounded-2xl p-6 mb-10 border-2 border-purple-100 shadow-xl animate-fadein">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-purple-700 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" />{dayjs(dayViewDate).format('dddd, MMMM D, YYYY')}</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded bg-purple-100 text-purple-700 font-bold" onClick={() => setDayViewDate(dayjs(dayViewDate).subtract(1, 'day').format('YYYY-MM-DD'))}>&lt;</button>
                <button className="px-3 py-1 rounded bg-purple-100 text-purple-700 font-bold" onClick={() => setDayViewDate(dayjs(dayViewDate).add(1, 'day').format('YYYY-MM-DD'))}>&gt;</button>
              </div>
            </div>
            <div className="divide-y divide-purple-100">
              {events.filter(e => e.date === dayViewDate).length === 0 && <div className="text-gray-400 py-8 text-center">No events for this day</div>}
              {events.filter(e => e.date === dayViewDate).sort((a, b) => a.time.localeCompare(b.time)).map(e => (
                <div key={e.id} className="py-4 flex items-start gap-4">
                  <div className="w-20 text-right text-xs text-purple-500 font-bold pt-1">{e.time}</div>
                  <div className="flex-1">
                    <div className="font-bold text-purple-700">{e.title}</div>
                    <div className="text-xs text-gray-500">{e.duration} min • {e.type}</div>
                    {e.description && <div className="text-xs text-gray-500 mt-1 italic">{e.description}</div>}
                    {e.location && <div className="text-xs text-blue-500 mt-1">{e.location}</div>}
                    {e.reminder > 0 && <div className="mt-2 text-purple-500 text-xs font-semibold">Reminds {reminderOptions.find(opt => opt.value === e.reminder)?.label}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List View (existing) */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-purple-700 mb-6 flex items-center gap-2"><Calendar className="w-6 h-6 text-purple-400" />Scheduled Events</h3>
            {events.map(event => {
              const evtType = eventTypes.find(t => t.value === event.type) || eventTypes[0];
              return (
                <div key={event.id} className="bg-white/90 border-2 border-purple-100 rounded-2xl p-7 hover:shadow-2xl transition-shadow flex items-center gap-6 animate-fadein">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg ${evtType.color} ring-4 ring-white`}>{evtType.label[0]}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${event.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} shadow-sm`}>{event.status}</span>
                      <h4 className="text-lg font-bold text-gray-800">{event.title}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2"><Calendar className="w-4 h-4 text-purple-400" /><span>{event.date}</span></div>
                      <div className="flex items-center space-x-2"><Clock className="w-4 h-4 text-blue-400" /><span>{event.time} ({event.duration}min)</span></div>
                      <div className="flex items-center space-x-2"><Globe className="w-4 h-4 text-pink-400" /><span>{event.timezone}</span></div>
                      {event.location && <div className="flex items-center space-x-2">{(event.location.includes('Zoom') || event.location.includes('Meet')) ? <Video className="w-4 h-4 text-blue-400" /> : <MapPin className="w-4 h-4 text-orange-400" />}<span>{event.location}</span></div>}
                      {event.repeat && event.repeat !== 'none' && <div className="flex items-center space-x-2"><span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-semibold">Repeats {event.repeat.charAt(0).toUpperCase() + event.repeat.slice(1)}</span></div>}
                    </div>
                    {event.description && <div className="mt-2 text-gray-500 italic text-sm">{event.description}</div>}
                    {event.attendees.length > 0 && <div className="flex items-center space-x-2 mt-3"><Users className="w-4 h-4 text-purple-400" /><span className="text-sm text-gray-600">{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span></div>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => handleEdit(event)} className="p-3 text-purple-400 hover:text-purple-700 hover:bg-purple-100 rounded-xl transition-colors" title="Edit"><Settings className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(event)} className="p-3 text-red-400 hover:text-red-700 hover:bg-red-100 rounded-xl transition-colors" title="Delete"><X className="w-5 h-5" /></button>
                  </div>
                </div>
              );
            })}
            {events.length === 0 && (<div className="text-center py-16 text-gray-400 animate-fadein"><Calendar className="w-20 h-20 mx-auto mb-6 text-purple-200" /><p className="text-2xl font-bold">No events scheduled yet</p><p className="text-md mt-2">Click <span className="text-purple-500 font-semibold">"New Event"</span> to get started</p></div>)}
          </div>
        )}

        {/* In-app Reminders/Notifications */}
        <div className="fixed top-6 right-2 sm:right-6 z-50 space-y-3" aria-live="polite" role="status">
          {reminders.map(r => (
            <div key={r.id + r.message} className="bg-purple-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-xl flex items-center gap-4 animate-fadein focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300">
              <AlertCircle className="w-6 h-6 text-yellow-300" />
              <span>{r.text}</span>
              <button onClick={() => dismissReminder(r.id, r.message)} className="ml-4 text-white hover:text-yellow-300 font-bold text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300" aria-label="Dismiss reminder">&times;</button>
            </div>
          ))}
        </div>
      </div>
      {/* Animations */}
      <style>{`
        @keyframes fadein { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: none; } }
        .animate-fadein { animation: fadein 0.7s cubic-bezier(.4,2,.6,1) both; }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0);} 50% { transform: translateY(-8px);} }
        .animate-bounce-slow { animation: bounce-slow 2.5s infinite; }
      `}</style>
    </div>
  );
}

VibeCalendarScheduler.propTypes = {
  events: PropTypes.array,
  timezones: PropTypes.array,
  eventTypes: PropTypes.array,
  onEventAdd: PropTypes.func,
};

VibeCalendarScheduler.defaultProps = {
  events: [],
  timezones: Intl.supportedValuesOf('timeZone'),
  eventTypes: [
    { value: 'meeting', label: 'Meeting', color: 'bg-blue-500' },
    { value: 'call',    label: 'Call',    color: 'bg-green-500' },
    { value: 'review',  label: 'Review',  color: 'bg-purple-500' },
    { value: 'focus',   label: 'Focus',   color: 'bg-orange-500' },
    { value: 'break',   label: 'Break',   color: 'bg-gray-500' },
  ],
  onEventAdd: null,
};
