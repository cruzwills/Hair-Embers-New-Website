// ═══════════════════════════════════════════════════════════════
//  Hair Embers — Google Apps Script Booking Backend
// ═══════════════════════════════════════════════════════════════

// ─── Configuration (plain values only — no function calls here) ─
var CALENDAR_ID = 'primary';
var SHEET_NAME  = 'Bookings';
var SAST_OFFSET = 2;  // UTC+2

// ─── Get timezone safely inside a function ─────────────────────
function getTimezone() {
  return Session.getScriptTimeZone();
}

// ─── Build today's date string without Utilities.formatDate ────
function getTodayString() {
  var now = new Date();
  var y   = now.getFullYear();
  var m   = String(now.getMonth() + 1).padStart(2, '0');
  var d   = String(now.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

// ─── Build timestamp string without Utilities.formatDate ───────
function getTimestampString() {
  var now = new Date();
  var y   = now.getFullYear();
  var mo  = String(now.getMonth() + 1).padStart(2, '0');
  var d   = String(now.getDate()).padStart(2, '0');
  var h   = String(now.getHours()).padStart(2, '0');
  var mi  = String(now.getMinutes()).padStart(2, '0');
  var s   = String(now.getSeconds()).padStart(2, '0');
  return d + '/' + mo + '/' + y + ' ' + h + ':' + mi + ':' + s;
}

// ─── Convert SAST date + time strings to a UTC Date object ─────
function sastToDate(dateStr, timeStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.indexOf('-') === -1) {
    throw new Error('sastToDate: bad dateStr -> ' + JSON.stringify(dateStr));
  }
  if (!timeStr || typeof timeStr !== 'string' || timeStr.indexOf(':') === -1) {
    throw new Error('sastToDate: bad timeStr -> ' + JSON.stringify(timeStr));
  }
  var d = dateStr.split('-').map(Number);
  var t = timeStr.split(':').map(Number);
  return new Date(Date.UTC(d[0], d[1] - 1, d[2], t[0] - SAST_OFFSET, t[1], 0));
}

// ─── doPost: receive booking, check conflicts, save ────────────
function doPost(e) {
  try {
    var data     = JSON.parse(e.postData.contents);
    var name     = data.name     || '';
    var phone    = data.phone    || '';
    var service  = data.service  || '';
    var dateStr  = data.date     || '';
    var timeStr  = data.time     || '';
    var duration = parseInt(data.duration) || 30;

    var start = sastToDate(dateStr, timeStr);
    var end   = new Date(start.getTime() + duration * 60000);

    // Check for conflicts
    var cal       = CalendarApp.getCalendarById(CALENDAR_ID);
    var events    = cal.getEvents(start, end);
    var conflicts = events.filter(function(ev) {
      return ev.getStartTime() < end && ev.getEndTime() > start;
    });
    if (conflicts.length > 0) {
      return jsonResponse({ success: false, error: 'Slot already booked' });
    }

    // Create calendar event
    cal.createEvent(
      'Hair Embers | ' + service + ' --- ' + name,
      start, end,
      {
        description: 'Client: ' + name + '\nPhone: ' + phone + '\nService: ' + service,
        location: 'Shop 4, Homegate Mall'
      }
    );

    // Log to sheet
    logToSheet(name, phone, service, dateStr, timeStr, duration + ' min');

    return jsonResponse({ success: true });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ─── doGet: return booked time slots for a given date ──────────
function doGet(e) {
  try {
    var dateStr = (e && e.parameter && e.parameter.date) ? e.parameter.date : null;
    if (!dateStr) return jsonResponse({ booked: [] });

    var dayStart = sastToDate(dateStr, '00:00');
    var dayEnd   = new Date(dayStart.getTime() + 24 * 3600000 - 1);

    var cal    = CalendarApp.getCalendarById(CALENDAR_ID);
    var events = cal.getEvents(dayStart, dayEnd);
    var tz     = getTimezone();

    var booked = events.map(function(ev) {
      return Utilities.formatDate(ev.getStartTime(), tz, 'HH:mm');
    });

    return jsonResponse({ booked: booked });

  } catch (err) {
    return jsonResponse({ booked: [], error: err.toString() });
  }
}

// ─── logToSheet ────────────────────────────────────────────────
function logToSheet(name, phone, service, date, time, duration) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var headers = ['Timestamp','Name','Phone','Service','Date','Time','Duration','Status'];
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

  // Write each cell individually so phone is stored as plain text (no #ERROR!)
  var row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1).setValue(getTimestampString());
  sheet.getRange(row, 2).setValue(name);
  sheet.getRange(row, 3).setValue("'" + phone);
  sheet.getRange(row, 4).setValue(service);
  sheet.getRange(row, 5).setValue(date);
  sheet.getRange(row, 6).setValue(time);
  sheet.getRange(row, 7).setValue(duration);
  sheet.getRange(row, 8).setValue('Pending Confirmation');
}

// ─── jsonResponse ──────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── testBooking ───────────────────────────────────────────────
// IMPORTANT: Select "testBooking" in the dropdown then click Run
function testBooking() {
  var today = getTodayString();
  Logger.log('Today    : ' + today);
  Logger.log('Timezone : ' + getTimezone());

  // Test 1: Sheet
  logToSheet('Test Client', '+263720000000', 'Wig Fitting & Consultation', today, '14:00', '30 min');
  Logger.log('OK Sheet: row written to ' + SHEET_NAME);

  // Test 2: Calendar
  var cal    = CalendarApp.getCalendarById(CALENDAR_ID);
  var events = cal.getEventsForDay(new Date());
  Logger.log('OK Calendar: connected, ' + events.length + ' event(s) today');

  // Test 3: Date math
  var testDate = sastToDate(today, '09:00');
  Logger.log('OK Date math: ' + today + ' 09:00 SAST -> ' + testDate.toISOString() + ' UTC');

  Logger.log('-----------------------------');
  Logger.log('All tests passed! Ready to deploy.');
}
