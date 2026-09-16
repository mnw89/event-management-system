import { getAuthState, login, logout } from "./auth.js";
import { createEvent, createParticipant, createRegistration, deleteEvent, deleteParticipant, getCollection, getDashboardData, initialiseData, saveAttendanceStatus, updateEvent, updateParticipant } from "./data.js";

const app = document.querySelector("#app");
let currentPage = "dashboard";
const eventFilters = { search: "", status: "All", sort: "date-asc" };
const participantFilters = { search: "" };
let registrationFeedback = "";
let attendanceEventId = "";
let attendanceFeedback = "";
let eventCreateFeedback = "";
let participantCreateFeedback = "";
initialiseData();

function loginTemplate() {
  return `
    <section class="login-page" aria-labelledby="login-title">
      <div class="login-card">
        <p class="eyebrow">Event Management System</p>
        <h1 id="login-title">Welcome back</h1>
        <p class="intro">Sign in to manage your events and participants.</p>
        <form id="login-form" novalidate>
          <label for="username">Username</label>
          <input id="username" name="username" autocomplete="username" required />
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required />
          <p id="login-feedback" class="feedback" role="alert" aria-live="polite"></p>
          <button type="submit">Log in</button>
        </form>
        <p class="demo-note">Demo access: <strong>admin</strong> / <strong>admin123</strong></p>
      </div>
    </section>`;
}

function dashboardTemplate(auth) {
  const { totals, upcomingEvents, recentRegistrations } = getDashboardData();
  return `
    <section class="app-shell" aria-label="Protected application area">
      <header class="header">
        <div><p class="eyebrow">Event Management System</p><h1>Dashboard</h1><p class="muted">Welcome back, ${auth.username}.</p></div>
        <button id="logout-button" class="secondary" type="button">Log out</button>
      </header>
      ${navigationTemplate("dashboard")}
      <section class="statistics-grid" aria-label="Dashboard statistics">
        ${statisticCard("Total Events", totals.events, "All stored events")}
        ${statisticCard("Upcoming Events", totals.upcomingEvents, "Scheduled from today")}
        ${statisticCard("Total Participants", totals.participants, "People in the directory")}
        ${statisticCard("Total Registrations", totals.registrations, "Across every event")}
        ${statisticCard("Attendance Rate", `${totals.attendanceRate}%`, "Present attendance records")}
      </section>
      <section class="dashboard-grid">
        <section class="dashboard-panel" aria-labelledby="upcoming-title">
          <div class="panel-heading"><div><p class="eyebrow">Schedule</p><h2 id="upcoming-title">Upcoming Events</h2></div><span>${upcomingEvents.length} scheduled</span></div>
          ${upcomingEvents.length ? `<div class="event-list">${upcomingEvents.map((event) => `
            <article class="list-item">
              <div><h3>${event.eventName}</h3><p>${formatEventDate(event.date, event.time)} · ${event.location}</p></div>
              <span class="status-badge">${event.status}</span>
            </article>`).join("")}</div>` : emptyState("No upcoming events", "Create an event to see it here.")}
        </section>
        <section class="dashboard-panel" aria-labelledby="registrations-title">
          <div class="panel-heading"><div><p class="eyebrow">Activity</p><h2 id="registrations-title">Recent Registrations</h2></div></div>
          ${recentRegistrations.length ? `<div class="registration-list">${recentRegistrations.map((registration) => `
            <article class="list-item registration-item">
              <div><h3>${registration.participantName}</h3><p>${registration.eventName}</p></div>
              <time datetime="${registration.registrationDate}">${formatRegistrationDate(registration.registrationDate)}</time>
            </article>`).join("")}</div>` : emptyState("No registrations yet", "Register a participant to see activity here.")}
        </section>
      </section>
      <section class="dashboard-panel quick-actions" aria-labelledby="actions-title">
        <div class="panel-heading"><div><p class="eyebrow">Shortcuts</p><h2 id="actions-title">Quick Actions</h2></div></div>
        <div class="action-buttons">
          <button type="button" data-action="event">Add Event</button>
          <button type="button" data-action="participant" class="secondary">Add Participant</button>
          <button type="button" data-action="registration" class="secondary">Register Participant</button>
        </div>
        <p id="action-feedback" class="feedback" aria-live="polite"></p>
      </section>
    </section>`;
}

function navigationTemplate(activePage) {
  return `<nav class="app-navigation" aria-label="Main navigation">
    <button type="button" class="nav-link ${activePage === "dashboard" ? "active" : ""}" data-page="dashboard">Dashboard</button>
    <button type="button" class="nav-link ${activePage === "events" ? "active" : ""}" data-page="events">Events</button>
    <button type="button" class="nav-link ${activePage === "participants" ? "active" : ""}" data-page="participants">Participants</button>
    <button type="button" class="nav-link ${activePage === "registrations" ? "active" : ""}" data-page="registrations">Registrations</button>
    <button type="button" class="nav-link ${activePage === "attendance" ? "active" : ""}" data-page="attendance">Attendance</button>
  </nav>`;
}

function eventsTemplate(auth) {
  const events = getFilteredEvents();
  const allEvents = getCollection("events");
  const registrationCounts = getRegistrationCounts();
  return `
    <section class="app-shell" aria-label="Protected application area">
      <header class="header">
        <div><p class="eyebrow">Event Management System</p><h1>Events</h1><p class="muted">Browse and review stored event records.</p></div>
        <button id="logout-button" class="secondary" type="button">Log out</button>
      </header>
      ${navigationTemplate("events")}
      <section class="dashboard-panel events-panel" aria-labelledby="events-title">
        <div class="panel-heading"><div><p class="eyebrow">Event directory</p><h2 id="events-title">All Events</h2></div><span>${events.length} of ${allEvents.length} shown</span></div>
        ${eventCreateForm()}
        <div class="event-controls">
          <label class="search-field" for="event-search"><span>Search events</span><input id="event-search" type="search" value="${eventFilters.search}" placeholder="Search by name or location" /></label>
          <label for="status-filter"><span>Status</span><select id="status-filter">${statusOptions()}</select></label>
          <label for="date-sort"><span>Sort by date</span><select id="date-sort">
            <option value="date-asc" ${eventFilters.sort === "date-asc" ? "selected" : ""}>Earliest first</option>
            <option value="date-desc" ${eventFilters.sort === "date-desc" ? "selected" : ""}>Latest first</option>
          </select></label>
        </div>
        ${events.length ? eventTable(events, registrationCounts) : eventEmptyState(allEvents.length)}
      </section>
    </section>`;
}

function eventCreateForm() {
  return `<details class="create-details" ${eventCreateFeedback ? "open" : ""}><summary>Add Event</summary>
    <form id="event-create-form" class="create-form" novalidate>
      <div class="form-grid">
        <label>Event Name<input name="eventName" required /></label>
        <label>Date<input name="date" type="date" required /></label>
        <label>Time<input name="time" type="time" required /></label>
        <label>Location<input name="location" required /></label>
        <label>Capacity<input name="capacity" type="number" min="1" required /></label>
        <label>Status<select name="status"><option>Upcoming</option><option>Draft</option><option>Ongoing</option><option>Completed</option><option>Cancelled</option></select></label>
        <label>Organizer<input name="organizer" /></label>
        <label>Description<input name="description" /></label>
      </div>
      <p id="event-create-feedback" class="feedback ${eventCreateFeedback.startsWith("Event created") ? "success-feedback" : ""}" role="alert">${eventCreateFeedback}</p>
      <button type="submit">Save Event</button>
    </form>
  </details>`;
}

function statusOptions() {
  const statuses = ["All", "Draft", "Upcoming", "Ongoing", "Completed", "Cancelled"];
  return statuses.map((status) => `<option value="${status}" ${eventFilters.status === status ? "selected" : ""}>${status === "All" ? "All statuses" : status}</option>`).join("");
}

function getFilteredEvents() {
  const query = eventFilters.search.toLowerCase();
  return getCollection("events")
    .filter((event) => eventFilters.status === "All" || event.status === eventFilters.status)
    .filter((event) => !query || `${event.eventName} ${event.location}`.toLowerCase().includes(query))
    .sort((first, second) => {
      const result = `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`);
      return eventFilters.sort === "date-desc" ? -result : result;
    });
}

function getRegistrationCounts() {
  return getCollection("registrations").reduce((counts, registration) => {
    counts.set(registration.eventId, (counts.get(registration.eventId) || 0) + 1);
    return counts;
  }, new Map());
}

function eventTable(events, registrationCounts) {
  return `<div class="table-scroll"><table><thead><tr><th>Event Name</th><th>Date</th><th>Time</th><th>Location</th><th>Capacity</th><th>Status</th><th>Registrations</th><th>Actions</th></tr></thead><tbody>${events.map((event) => `<tr>
    <td><strong>${event.eventName}</strong></td><td>${formatShortDate(event.date)}</td><td>${event.time}</td><td>${event.location}</td><td>${event.capacity}</td><td><span class="status-badge">${event.status}</span></td><td>${registrationCounts.get(event.eventId) || 0}</td>
    <td><div class="table-actions"><button type="button" disabled>View</button><button type="button" data-edit-event="${event.eventId}">Edit</button><button type="button" data-delete-event="${event.eventId}">Delete</button></div></td>
  </tr>`).join("")}</tbody></table></div>`;
}

function eventEmptyState(totalEvents) {
  return totalEvents ? emptyState("No matching events", "Try a different search term or status filter.") : emptyState("No events yet", "Events will appear here once they are created.");
}

function participantsTemplate(auth) {
  const participants = getFilteredParticipants();
  const allParticipants = getCollection("participants");
  const registrationCounts = getParticipantRegistrationCounts();
  return `
    <section class="app-shell" aria-label="Protected application area">
      <header class="header">
        <div><p class="eyebrow">Event Management System</p><h1>Participants</h1><p class="muted">Browse and review your participant directory.</p></div>
        <button id="logout-button" class="secondary" type="button">Log out</button>
      </header>
      ${navigationTemplate("participants")}
      <section class="dashboard-panel events-panel" aria-labelledby="participants-title">
        <div class="panel-heading"><div><p class="eyebrow">Participant directory</p><h2 id="participants-title">All Participants</h2></div><span>${participants.length} of ${allParticipants.length} shown</span></div>
        ${participantCreateForm()}
        <div class="participant-controls">
          <label for="participant-search"><span>Search participants</span><input id="participant-search" type="search" value="${participantFilters.search}" placeholder="Search by name, email, or organisation" /></label>
        </div>
        ${participants.length ? participantTable(participants, registrationCounts) : participantEmptyState(allParticipants.length)}
      </section>
    </section>`;
}

function participantCreateForm() {
  return `<details class="create-details" ${participantCreateFeedback ? "open" : ""}><summary>Add Participant</summary>
    <form id="participant-create-form" class="create-form" novalidate>
      <div class="form-grid">
        <label>Name<input name="name" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Phone<input name="phone" type="tel" /></label>
        <label>Organisation<input name="organisation" /></label>
      </div>
      <p id="participant-create-feedback" class="feedback ${participantCreateFeedback.startsWith("Participant created") ? "success-feedback" : ""}" role="alert">${participantCreateFeedback}</p>
      <button type="submit">Save Participant</button>
    </form>
  </details>`;
}

function getFilteredParticipants() {
  const query = participantFilters.search.toLowerCase();
  return getCollection("participants")
    .filter((participant) => !query || `${participant.name} ${participant.email} ${participant.organisation}`.toLowerCase().includes(query))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function getParticipantRegistrationCounts() {
  return getCollection("registrations").reduce((counts, registration) => {
    counts.set(registration.participantId, (counts.get(registration.participantId) || 0) + 1);
    return counts;
  }, new Map());
}

function participantTable(participants, registrationCounts) {
  return `<div class="table-scroll"><table class="participant-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Organisation</th><th>Registrations</th><th>Actions</th></tr></thead><tbody>${participants.map((participant) => `<tr>
    <td><strong>${participant.name}</strong></td><td>${participant.email}</td><td>${participant.phone}</td><td>${participant.organisation}</td><td>${registrationCounts.get(participant.participantId) || 0}</td>
    <td><div class="table-actions"><button type="button" disabled>View</button><button type="button" data-edit-participant="${participant.participantId}">Edit</button><button type="button" data-delete-participant="${participant.participantId}">Delete</button></div></td>
  </tr>`).join("")}</tbody></table></div>`;
}

function participantEmptyState(totalParticipants) {
  return totalParticipants ? emptyState("No matching participants", "Try a different search term.") : emptyState("No participants yet", "Participants will appear here once they are added.");
}

function registrationsTemplate(auth) {
  const events = getCollection("events");
  const participants = getCollection("participants");
  return `
    <section class="app-shell" aria-label="Protected application area">
      <header class="header">
        <div><p class="eyebrow">Event Management System</p><h1>Registrations</h1><p class="muted">Register an existing participant for an existing event.</p></div>
        <button id="logout-button" class="secondary" type="button">Log out</button>
      </header>
      ${navigationTemplate("registrations")}
      <section class="dashboard-panel registration-panel" aria-labelledby="registration-title">
        <div class="panel-heading"><div><p class="eyebrow">New registration</p><h2 id="registration-title">Register Participant</h2></div></div>
        <form id="registration-form" class="registration-form" novalidate>
          <label for="registration-event">Event<span class="required">Required</span></label>
          <select id="registration-event" name="eventId" required>
            <option value="">Choose an event</option>
            ${events.map((event) => `<option value="${event.eventId}">${event.eventName} — ${formatShortDate(event.date)}</option>`).join("")}
          </select>
          <label for="registration-participant">Participant<span class="required">Required</span></label>
          <select id="registration-participant" name="participantId" required>
            <option value="">Choose a participant</option>
            ${participants.map((participant) => `<option value="${participant.participantId}">${participant.name} — ${participant.email}</option>`).join("")}
          </select>
          <p id="registration-feedback" class="feedback ${registrationFeedback.startsWith("Registration created") ? "success-feedback" : ""}" role="alert" aria-live="polite">${registrationFeedback}</p>
          <button type="submit">Create Registration</button>
        </form>
      </section>
    </section>`;
}

function attendanceTemplate(auth) {
  const events = getCollection("events");
  const registeredParticipants = getRegisteredParticipants(attendanceEventId);
  const attendanceByParticipant = new Map(getCollection("attendance")
    .filter((record) => record.eventId === attendanceEventId)
    .map((record) => [record.participantId, record.status]));
  return `
    <section class="app-shell" aria-label="Protected application area">
      <header class="header">
        <div><p class="eyebrow">Event Management System</p><h1>Attendance</h1><p class="muted">Mark attendance only for participants registered for the selected event.</p></div>
        <button id="logout-button" class="secondary" type="button">Log out</button>
      </header>
      ${navigationTemplate("attendance")}
      <section class="dashboard-panel attendance-panel" aria-labelledby="attendance-title">
        <div class="panel-heading"><div><p class="eyebrow">Event attendance</p><h2 id="attendance-title">Mark Attendance</h2></div></div>
        <label class="attendance-event-label" for="attendance-event"><span>Select event</span><select id="attendance-event">
          <option value="">Choose an event</option>
          ${events.map((event) => `<option value="${event.eventId}" ${attendanceEventId === event.eventId ? "selected" : ""}>${event.eventName} — ${formatShortDate(event.date)}</option>`).join("")}
        </select></label>
        ${attendanceEventId ? attendanceRoster(registeredParticipants, attendanceByParticipant) : emptyState("Choose an event", "Select an event to view its registered participants.")}
        <p id="attendance-feedback" class="feedback ${attendanceFeedback.startsWith("Attendance saved") ? "success-feedback" : ""}" role="alert" aria-live="polite">${attendanceFeedback}</p>
      </section>
    </section>`;
}

function getRegisteredParticipants(eventId) {
  if (!eventId) return [];
  const participantsById = new Map(getCollection("participants").map((participant) => [participant.participantId, participant]));
  return getCollection("registrations")
    .filter((registration) => registration.eventId === eventId)
    .map((registration) => participantsById.get(registration.participantId))
    .filter(Boolean)
    .sort((first, second) => first.name.localeCompare(second.name));
}

function attendanceRoster(participants, attendanceByParticipant) {
  if (!participants.length) return emptyState("No registered participants", "Register participants for this event before taking attendance.");
  return `<div class="table-scroll attendance-table"><table><thead><tr><th>Participant</th><th>Email</th><th>Organisation</th><th>Attendance</th></tr></thead><tbody>${participants.map((participant) => `<tr>
    <td><strong>${participant.name}</strong></td><td>${participant.email}</td><td>${participant.organisation}</td><td><select class="attendance-status" data-participant-id="${participant.participantId}" aria-label="Attendance for ${participant.name}">
      <option value="" ${!attendanceByParticipant.get(participant.participantId) ? "selected" : ""}>Not marked</option>
      <option value="Present" ${attendanceByParticipant.get(participant.participantId) === "Present" ? "selected" : ""}>Present</option>
      <option value="Absent" ${attendanceByParticipant.get(participant.participantId) === "Absent" ? "selected" : ""}>Absent</option>
    </select></td>
  </tr>`).join("")}</tbody></table></div>`;
}

function statisticCard(label, value, detail) {
  return `<article class="statistic-card"><p>${label}</p><strong>${value}</strong><span>${detail}</span></article>`;
}

function emptyState(title, message) {
  return `<div class="empty-state"><h3>${title}</h3><p>${message}</p></div>`;
}

function formatEventDate(date, time) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T${time}`)) + ` · ${time}`;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T00:00`));
}

function formatRegistrationDate(date) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(date));
}

function bindEvents() {
  const form = document.querySelector("#login-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    const feedback = document.querySelector("#login-feedback");
    if (!username || !password) {
      feedback.textContent = "Enter both username and password.";
      return;
    }
    const result = login(username, password);
    if (!result.ok) {
      feedback.textContent = result.message;
      return;
    }
    render();
  });
  document.querySelector("#logout-button")?.addEventListener("click", () => {
    logout();
    render();
  });
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPage = button.dataset.page;
      render();
    });
  });
  const search = document.querySelector("#event-search");
  search?.addEventListener("input", () => {
    eventFilters.search = search.value;
    render();
    const newSearch = document.querySelector("#event-search");
    newSearch.focus();
    newSearch.setSelectionRange(eventFilters.search.length, eventFilters.search.length);
  });
  document.querySelector("#status-filter")?.addEventListener("change", (event) => {
    eventFilters.status = event.target.value;
    render();
  });
  document.querySelector("#date-sort")?.addEventListener("change", (event) => {
    eventFilters.sort = event.target.value;
    render();
  });
  const eventCreateFormElement = document.querySelector("#event-create-form");
  eventCreateFormElement?.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = createEvent(Object.fromEntries(new FormData(eventCreateFormElement)));
    if (!result.ok) {
      eventCreateFeedback = result.message;
      const feedback = document.querySelector("#event-create-feedback");
      feedback.textContent = eventCreateFeedback;
      feedback.classList.remove("success-feedback");
      return;
    }
    eventCreateFeedback = "Event created successfully.";
    render();
  });
  const registrationForm = document.querySelector("#registration-form");
  registrationForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const eventId = registrationForm.elements.eventId.value;
    const participantId = registrationForm.elements.participantId.value;
    const feedback = document.querySelector("#registration-feedback");
    const result = createRegistration(eventId, participantId);
    if (!result.ok) {
      registrationFeedback = result.message;
      feedback.textContent = registrationFeedback;
      feedback.classList.remove("success-feedback");
      return;
    }
    registrationFeedback = "Registration created successfully.";
    render();
  });
  document.querySelector("#attendance-event")?.addEventListener("change", (event) => {
    attendanceEventId = event.target.value;
    attendanceFeedback = "";
    render();
  });
  document.querySelectorAll(".attendance-status").forEach((select) => {
    select.addEventListener("change", () => {
      const result = saveAttendanceStatus(attendanceEventId, select.dataset.participantId, select.value);
      attendanceFeedback = result.ok ? "Attendance saved successfully." : result.message;
      render();
    });
  });
  document.querySelectorAll("[data-edit-event]").forEach((button) => {
    button.addEventListener("click", () => {
      const eventRecord = getCollection("events").find((event) => event.eventId === button.dataset.editEvent);
      if (!eventRecord) return;
      const row = button.closest("tr");
      row.innerHTML = `<td><input class="inline-edit" data-edit-name value="${eventRecord.eventName}" aria-label="Event name" /></td><td>${formatShortDate(eventRecord.date)}</td><td>${eventRecord.time}</td><td>${eventRecord.location}</td><td>${eventRecord.capacity}</td><td><span class="status-badge">${eventRecord.status}</span></td><td>${getRegistrationCounts().get(eventRecord.eventId) || 0}</td><td><div class="table-actions"><button type="button" data-save-event>Save</button><button type="button" data-cancel-edit>Cancel</button></div></td>`;
      row.querySelector("[data-save-event]").addEventListener("click", () => {
        const result = updateEvent(eventRecord.eventId, { ...eventRecord, eventName: row.querySelector("[data-edit-name]").value });
        if (!result.ok) window.alert(result.message);
      });
      row.querySelector("[data-cancel-edit]").addEventListener("click", render);
    });
  });
  document.querySelectorAll("[data-delete-event]").forEach((button) => {
    button.addEventListener("click", () => {
      const eventRecord = getCollection("events").find((event) => event.eventId === button.dataset.deleteEvent);
      if (!eventRecord || !window.confirm(`Delete ${eventRecord.eventName}? Related registrations and attendance will also be removed.`)) return;
      deleteEvent(eventRecord.eventId);
    });
  });
  document.querySelectorAll("[data-edit-participant]").forEach((button) => {
    button.addEventListener("click", () => {
      const participant = getCollection("participants").find((record) => record.participantId === button.dataset.editParticipant);
      if (!participant) return;
      const row = button.closest("tr");
      row.innerHTML = `<td><input class="inline-edit" data-edit-name value="${participant.name}" aria-label="Participant name" /></td><td>${participant.email}</td><td>${participant.phone}</td><td>${participant.organisation}</td><td>${getParticipantRegistrationCounts().get(participant.participantId) || 0}</td><td><div class="table-actions"><button type="button" data-save-participant>Save</button><button type="button" data-cancel-edit>Cancel</button></div></td>`;
      row.querySelector("[data-save-participant]").addEventListener("click", () => {
        const result = updateParticipant(participant.participantId, { ...participant, name: row.querySelector("[data-edit-name]").value });
        if (!result.ok) window.alert(result.message);
      });
      row.querySelector("[data-cancel-edit]").addEventListener("click", render);
    });
  });
  document.querySelectorAll("[data-delete-participant]").forEach((button) => {
    button.addEventListener("click", () => {
      const participant = getCollection("participants").find((record) => record.participantId === button.dataset.deleteParticipant);
      if (!participant || !window.confirm(`Delete ${participant.name}? Related registrations and attendance will also be removed.`)) return;
      deleteParticipant(participant.participantId);
    });
  });
  const participantSearch = document.querySelector("#participant-search");
  participantSearch?.addEventListener("input", () => {
    participantFilters.search = participantSearch.value;
    render();
    const newSearch = document.querySelector("#participant-search");
    newSearch.focus();
    newSearch.setSelectionRange(participantFilters.search.length, participantFilters.search.length);
  });
  const participantCreateFormElement = document.querySelector("#participant-create-form");
  participantCreateFormElement?.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = createParticipant(Object.fromEntries(new FormData(participantCreateFormElement)));
    if (!result.ok) {
      participantCreateFeedback = result.message;
      const feedback = document.querySelector("#participant-create-feedback");
      feedback.textContent = participantCreateFeedback;
      feedback.classList.remove("success-feedback");
      return;
    }
    participantCreateFeedback = "Participant created successfully.";
    render();
  });
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPage = button.dataset.action === "event" ? "events" : button.dataset.action === "participant" ? "participants" : "registrations";
      render();
    });
  });
}

function render() {
  const auth = getAuthState();
  app.innerHTML = !auth ? loginTemplate() : currentPage === "events" ? eventsTemplate(auth) : currentPage === "participants" ? participantsTemplate(auth) : currentPage === "registrations" ? registrationsTemplate(auth) : currentPage === "attendance" ? attendanceTemplate(auth) : dashboardTemplate(auth);
  bindEvents();
}

render();

window.addEventListener("eventManagement:data-changed", () => {
  if (getAuthState()) render();
});
