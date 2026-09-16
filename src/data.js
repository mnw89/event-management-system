export const STORAGE_KEYS = {
  events: "eventManagement_events",
  participants: "eventManagement_participants",
  registrations: "eventManagement_registrations",
  attendance: "eventManagement_attendance"
};

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function registrationDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

const seedData = {
  events: [
    { eventId: "event-001", eventName: "Leadership Workshop", description: "Practical leadership skills for committee members.", date: dateOffset(7), time: "09:00", location: "Seminar Room A", organizer: "Student Affairs", capacity: 40, status: "Upcoming" },
    { eventId: "event-002", eventName: "Career Readiness Talk", description: "Industry insights for final-year students.", date: dateOffset(18), time: "14:00", location: "Auditorium", organizer: "Career Centre", capacity: 120, status: "Upcoming" },
    { eventId: "event-003", eventName: "Volunteer Appreciation Day", description: "A thank-you gathering for student volunteers.", date: dateOffset(-12), time: "10:00", location: "Student Hub", organizer: "Student Affairs", capacity: 60, status: "Completed" }
  ],
  participants: [
    { participantId: "participant-001", name: "Aisha Rahman", email: "aisha@example.com", phone: "+60 12-345 6789", organisation: "Example University" },
    { participantId: "participant-002", name: "Daniel Lee", email: "daniel@example.com", phone: "+60 11-234 5678", organisation: "Example University" },
    { participantId: "participant-003", name: "Mei Tan", email: "mei@example.com", phone: "+60 17-456 7890", organisation: "Student Council" },
    { participantId: "participant-004", name: "Farid Ahmad", email: "farid@example.com", phone: "+60 16-567 8901", organisation: "Example University" }
  ],
  registrations: [
    { registrationId: "registration-001", eventId: "event-001", participantId: "participant-001", registrationDate: registrationDateOffset(-1), status: "Registered" },
    { registrationId: "registration-002", eventId: "event-002", participantId: "participant-002", registrationDate: registrationDateOffset(-3), status: "Registered" },
    { registrationId: "registration-003", eventId: "event-003", participantId: "participant-003", registrationDate: registrationDateOffset(-10), status: "Registered" },
    { registrationId: "registration-004", eventId: "event-003", participantId: "participant-004", registrationDate: registrationDateOffset(-9), status: "Registered" }
  ],
  attendance: [
    { attendanceId: "attendance-001", eventId: "event-003", participantId: "participant-003", status: "Present" },
    { attendanceId: "attendance-002", eventId: "event-003", participantId: "participant-004", status: "Absent" }
  ]
};

export function getCollection(name) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS[name]));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function saveCollection(name, records) {
  localStorage.setItem(STORAGE_KEYS[name], JSON.stringify(records));
  window.dispatchEvent(new CustomEvent("eventManagement:data-changed"));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEvent(values) {
  const eventName = values.eventName?.trim();
  const date = values.date;
  const time = values.time;
  const location = values.location?.trim();
  const capacity = Number(values.capacity);
  if (!eventName) return { ok: false, message: "Event name is required." };
  if (!date) return { ok: false, message: "Event date is required." };
  if (!time) return { ok: false, message: "Event time is required." };
  if (!location) return { ok: false, message: "Event location is required." };
  if (!Number.isFinite(capacity) || capacity <= 0) return { ok: false, message: "Capacity must be a positive number." };

  const event = {
    eventId: createId("event"),
    eventName,
    description: values.description?.trim() || "",
    date,
    time,
    location,
    organizer: values.organizer?.trim() || "",
    capacity,
    status: values.status || "Upcoming"
  };
  saveCollection("events", [...getCollection("events"), event]);
  return { ok: true, event };
}

export function createParticipant(values) {
  const name = values.name?.trim();
  const email = values.email?.trim().toLowerCase();
  if (!name) return { ok: false, message: "Participant name is required." };
  if (!email) return { ok: false, message: "Email is required." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Enter a valid email address." };
  if (getCollection("participants").some((participant) => participant.email.toLowerCase() === email)) {
    return { ok: false, message: "A participant with this email already exists." };
  }

  const participant = {
    participantId: createId("participant"),
    name,
    email,
    phone: values.phone?.trim() || "",
    organisation: values.organisation?.trim() || ""
  };
  saveCollection("participants", [...getCollection("participants"), participant]);
  return { ok: true, participant };
}

export function updateEvent(eventId, values) {
  const events = getCollection("events");
  const index = events.findIndex((event) => event.eventId === eventId);
  if (index < 0) return { ok: false, message: "Event could not be found." };
  const result = validateEvent(values);
  if (!result.ok) return result;
  const event = { ...events[index], ...result.values };
  events[index] = event;
  saveCollection("events", events);
  return { ok: true, event };
}

export function deleteEvent(eventId) {
  const events = getCollection("events");
  if (!events.some((event) => event.eventId === eventId)) return { ok: false, message: "Event could not be found." };
  const registrations = getCollection("registrations").filter((registration) => registration.eventId !== eventId);
  const attendance = getCollection("attendance").filter((record) => record.eventId !== eventId);
  localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events.filter((event) => event.eventId !== eventId)));
  localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(registrations));
  localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(attendance));
  window.dispatchEvent(new CustomEvent("eventManagement:data-changed"));
  return { ok: true };
}

export function updateParticipant(participantId, values) {
  const participants = getCollection("participants");
  const index = participants.findIndex((participant) => participant.participantId === participantId);
  if (index < 0) return { ok: false, message: "Participant could not be found." };
  const result = validateParticipant(values, participantId);
  if (!result.ok) return result;
  const participant = { ...participants[index], ...result.values };
  participants[index] = participant;
  saveCollection("participants", participants);
  return { ok: true, participant };
}

export function deleteParticipant(participantId) {
  const participants = getCollection("participants");
  if (!participants.some((participant) => participant.participantId === participantId)) return { ok: false, message: "Participant could not be found." };
  const registrations = getCollection("registrations").filter((registration) => registration.participantId !== participantId);
  const attendance = getCollection("attendance").filter((record) => record.participantId !== participantId);
  localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(participants.filter((participant) => participant.participantId !== participantId)));
  localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(registrations));
  localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(attendance));
  window.dispatchEvent(new CustomEvent("eventManagement:data-changed"));
  return { ok: true };
}

function validateEvent(values) {
  const eventName = values.eventName?.trim();
  const location = values.location?.trim();
  const capacity = Number(values.capacity);
  if (!eventName) return { ok: false, message: "Event name is required." };
  if (!values.date) return { ok: false, message: "Event date is required." };
  if (!values.time) return { ok: false, message: "Event time is required." };
  if (!location) return { ok: false, message: "Event location is required." };
  if (!Number.isFinite(capacity) || capacity <= 0) return { ok: false, message: "Capacity must be a positive number." };
  return { ok: true, values: { eventName, description: values.description?.trim() || "", date: values.date, time: values.time, location, organizer: values.organizer?.trim() || "", capacity, status: values.status || "Upcoming" } };
}

function validateParticipant(values, participantId) {
  const name = values.name?.trim();
  const email = values.email?.trim().toLowerCase();
  if (!name) return { ok: false, message: "Participant name is required." };
  if (!email) return { ok: false, message: "Email is required." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Enter a valid email address." };
  if (getCollection("participants").some((participant) => participant.participantId !== participantId && participant.email.toLowerCase() === email)) return { ok: false, message: "A participant with this email already exists." };
  return { ok: true, values: { name, email, phone: values.phone?.trim() || "", organisation: values.organisation?.trim() || "" } };
}

export function createRegistration(eventId, participantId) {
  const events = getCollection("events");
  const participants = getCollection("participants");
  const registrations = getCollection("registrations");
  const event = events.find((record) => record.eventId === eventId);
  const participant = participants.find((record) => record.participantId === participantId);

  if (!event) return { ok: false, message: "Select an existing event." };
  if (!participant) return { ok: false, message: "Select an existing participant." };
  if (registrations.some((record) => record.eventId === eventId && record.participantId === participantId)) {
    return { ok: false, message: "This participant is already registered for the selected event." };
  }

  const registrationCount = registrations.filter((record) => record.eventId === eventId).length;
  if (registrationCount >= Number(event.capacity)) {
    return { ok: false, message: "This event has reached its registration capacity." };
  }

  const registration = {
    registrationId: createId("registration"),
    eventId,
    participantId,
    registrationDate: new Date().toISOString(),
    status: "Registered"
  };
  saveCollection("registrations", [...registrations, registration]);
  return { ok: true, registration };
}

export function saveAttendanceStatus(eventId, participantId, status) {
  const registrations = getCollection("registrations");
  const isRegistered = registrations.some((record) => record.eventId === eventId && record.participantId === participantId);
  if (!isRegistered) return { ok: false, message: "Attendance can only be recorded for registered participants." };
  if (!["Present", "Absent"].includes(status)) return { ok: false, message: "Choose Present or Absent." };

  const attendance = getCollection("attendance");
  const existingIndex = attendance.findIndex((record) => record.eventId === eventId && record.participantId === participantId);
  const record = {
    attendanceId: existingIndex >= 0 ? attendance[existingIndex].attendanceId : createId("attendance"),
    eventId,
    participantId,
    status
  };
  const updatedAttendance = existingIndex >= 0
    ? attendance.map((item, index) => index === existingIndex ? record : item)
    : [...attendance, record];

  saveCollection("attendance", updatedAttendance);
  return { ok: true, record };
}

export function initialiseData() {
  Object.entries(seedData).forEach(([name, records]) => {
    if (localStorage.getItem(STORAGE_KEYS[name]) === null) {
      localStorage.setItem(STORAGE_KEYS[name], JSON.stringify(records));
    }
  });
}

export function getDashboardData() {
  const events = getCollection("events");
  const participants = getCollection("participants");
  const registrations = getCollection("registrations");
  const attendance = getCollection("attendance");
  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events
    .filter((event) => event.status === "Upcoming" && event.date >= today)
    .sort((first, second) => `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`));
  const presentCount = attendance.filter((record) => record.status === "Present").length;
  const attendanceRate = registrations.length ? Math.round((presentCount / registrations.length) * 100) : 0;
  const participantById = new Map(participants.map((participant) => [participant.participantId, participant]));
  const eventById = new Map(events.map((event) => [event.eventId, event]));
  const recentRegistrations = [...registrations]
    .sort((first, second) => new Date(second.registrationDate) - new Date(first.registrationDate))
    .slice(0, 4)
    .map((registration) => ({
      ...registration,
      participantName: participantById.get(registration.participantId)?.name || "Deleted participant",
      eventName: eventById.get(registration.eventId)?.eventName || "Deleted event"
    }));

  return {
    totals: {
      events: events.length,
      upcomingEvents: upcomingEvents.length,
      participants: participants.length,
      registrations: registrations.length,
      attendanceRate
    },
    upcomingEvents,
    recentRegistrations
  };
}
