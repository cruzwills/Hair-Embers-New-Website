// ═══════════════════════════════════════════════════════════════
//  Hair Embers — Google Apps Script Booking Backend
//  Paste this entire file into script.google.com
//  Run testBooking() first to grant permissions and verify setup
// ═══════════════════════════════════════════════════════════════

// ─── Configuration ─────────────────────────────────────────────
var CALENDAR_ID = 'primary';          // 'primary' = your main Google Calendar
var TIMEZONE    = 'Africa/Johannesburg';
var SHEET_NAME  = 'Bookings';
var SAST_OFFSET = 2;                  // UTC+2, South Africa has no DST

// ─── Helper: build a UTC Date from a SAST date + time string ───
// dateStr: 'YYYY-MM-DD'  timeStr: 'HH:MM'
function sastToDate(dateStr, timeStr) {
  var d = dateStr.split('-').map(Number);
  var t = timeStr.split(':').map(Number);
  // Subtract SAST offset so the internal UTC value is correct
  return new Date(Date.UTC(d[0], d[1] - 1, d[2], t[0] - SAST_OFFSET, t[1], 0));
}

// ─── doPost: Receive booking JSON, check conflicts, save ───────
function doPost(e) {
  try {
    var data     = JSON.parse(e.postData.contents);
    var name     = data.name     || '';
    var phone    = data.phone    || '';
    var service  = data.service  || '';
    var dateStr  = data.date;           // 'YYYY-MM-DD'
    var timeStr  = data.time;           // 'HH:MM'
    var duration = data.duration || 60; // minutes

    var start = sastToDate(dateStr, timeStr);
    var end   = new Date(start.getTime() + duration * 60000);

    // ── Check Google Calendar for conflicts ──
    var cal    = CalendarApp.getCalendarById(CALENDAR_ID);
    var events = cal.getEvents(start, end);
    // Filter to only overlapping events (getEvents can return adjacent ones)
    var conflicts = events.filter(function(ev) {
      return ev.getStartTime() < end && ev.getEndTime() > start;
    });
    if (conflicts.length > 0) {
      return jsonResponse({ success: false, error: 'Slot already booked' });
    }

    // ── Create Google Calendar event ──
    cal.createEvent(
      'Hair Embers | ' + service + ' — ' + name,
      start,
      end,
      {
        description: 'Client: '  + name    + '\n' +
                     'Phone: '   + phone   + '\n' +
                     'Service: ' + service,
        location: 'Shop 4, Homegate Mall'
      }
    );

    // ── Log to Google Sheet ──
    logToSheet(name, phone, service, dateStr, timeStr, duration + ' min');

    return jsonResponse({ success: true });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ─── doGet: Return booked time slots for a given date ──────────
// Called by the website as:  ?date=YYYY-MM-DD
// Returns:  { booked: ["09:00", "11:00", ...] }
function doGet(e) {
  try {
    var dateStr = (e && e.parameter && e.parameter.date) ? e.parameter.date : null;
    if (!dateStr) return jsonResponse({ booked: [] });

    // Full day window in SAST
    var dayStart = sastToDate(dateStr, '00:00');
    var dayEnd   = new Date(dayStart.getTime() + 24 * 3600000 - 1);

    var cal    = CalendarApp.getCalendarById(CALENDAR_ID);
    var events = cal.getEvents(dayStart, dayEnd);

    var booked = events.map(function(ev) {
      return Utilities.formatDate(ev.getStartTime(), TIMEZONE, 'HH:mm');
    });

    return jsonResponse({ booked: booked });

  } catch (err) {
    return jsonResponse({ booked: [], error: err.toString() });
  }
}

// ─── logToSheet: Append one row to the Bookings sheet ──────────
function logToSheet(name, phone, service, date, time, duration) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Auto-create the sheet with styled headers if it does not exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var headers = ['Timestamp', 'Name', 'Phone', 'Service', 'Date', 'Time', 'Duration', 'Status'];
    var hRange  = sheet.getRange(1, 1, 1, headers.length);
    hRange.setValues([headers]);
    hRange.setFontWeight('bold');
    hRange.setBackground('#F04C8A');
    hRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 170);
    sheet.setColumnWidth(4, 210);
    sheet.setColumnWidth(8, 180);
  }

  sheet.appendRow([
    Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy HH:mm:ss'),
    name,
    phone,
    service,
    date,
    time,
    duration,
    'Pending Confirmation'
  ]);
}

// ─── jsonResponse: Shared helper ───────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── testBooking: Run this manually BEFORE deploying ───────────
// Select this function from the dropdown and click Run (▶).
// Approve any permission prompts, then check the Execution log.
function testBooking() {
  var today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  Logger.log('▶ Running testBooking for date: ' + today);
  Logger.log('  Script timezone: ' + Session.getScriptTimeZone());

  // ── Test 1: Sheet logging ──
  logToSheet(
    'Test Client',
    '+27 72 000 0000',
    'Wig Fitting & Consultation',
    today,
    '14:00',
    '60 min'
  );
  Logger.log('✅ Sheet: test row appended to "' + SHEET_NAME + '" tab');

  // ── Test 2: Calendar read ──
  var cal    = CalendarApp.getCalendarById(CALENDAR_ID);
  var events = cal.getEventsForDay(new Date());
  Logger.log('✅ Calendar: connected — ' + events.length + ' event(s) today');

  // ── Test 3: Date conversion sanity check ──
  var testDate = sastToDate(today, '09:00');
  Logger.log('✅ Date math: ' + today + ' 09:00 SAST → ' + testDate.toISOString() + ' (UTC)');

  Logger.log('─────────────────────────────────');
  Logger.log('All tests passed! Now deploy as a Web App (see SETUP.md).');
}
