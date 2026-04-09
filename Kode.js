function doGet(e) {
  Logger.log('doGet called with parameter: ' + JSON.stringify(e));
  var page = e.parameter.page || 'auth';
  Logger.log('Page: ' + page);

  try {
    var user = getUserFromSession();
    Logger.log('User session: ' + (user ? 'Found' : 'Not found'));

    if (!user && page !== 'auth') {
      Logger.log('Redirecting to Auth');
      return HtmlService.createTemplateFromFile('Auth').evaluate().setTitle('Login - YPWI GAS App');
    }

    Logger.log('Serving page: ' + page);
    switch(page) {
      case 'dashboard':
        return HtmlService.createTemplateFromFile('Page_Dashboard').evaluate().setTitle('Dashboard - YPWI GAS App');
      case 'database':
        return HtmlService.createTemplateFromFile('Page_Database').evaluate().setTitle('Database - YPWI GAS App');
      case 'payroll':
        return HtmlService.createTemplateFromFile('Page_Payroll').evaluate().setTitle('Payroll - YPWI GAS App');
      default:
        return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('YPWI GAS App');
    }
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return HtmlService.createHtmlOutput('Error: ' + error.toString()).setTitle('Error');
  }
}

function login(id, password) {
  Logger.log('Login attempt: ID=' + id);
  try {
    var sheet = SpreadsheetApp.openById('16oU2LIbN1R64IeRXDW2kZQV2pukqWTo3wcZcUID3YXY').getSheetByName('Database');
    var data = sheet.getDataRange().getValues();
    Logger.log('Database data length: ' + data.length);
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id && data[i][2] == password) { // ID kolom 0, NIY kolom 2 sebagai password
        var user = {
          id: data[i][0],
          nama: data[i][1],
          jabatan: data[i][12],
          asalSekolah: data[i][10],
          noWA: data[i][8]
        };
        setUserSession(user);
        Logger.log('Login successful for: ' + user.id);
        return user;
      }
    }
    Logger.log('Login failed: Invalid credentials');
    return null;
  } catch (error) {
    Logger.log('Error in login: ' + error.toString());
    return null;
  }
}

function getUserFromSession() {
  var userProperties = PropertiesService.getUserProperties();
  var userStr = userProperties.getProperty('user');
  return userStr ? JSON.parse(userStr) : null;
}

function setUserSession(user) {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('user', JSON.stringify(user));
}

function logout() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('user');
}

function getFilteredData(sheetName) {
  Logger.log('getFilteredData called for sheet: ' + sheetName);
  var user = getUserFromSession();
  Logger.log('User: ' + JSON.stringify(user));
  if (!user) return [];

  try {
    var sheet = SpreadsheetApp.openById('16oU2LIbN1R64IeRXDW2kZQV2pukqWTo3wcZcUID3YXY').getSheetByName(sheetName);
    var data = sheet.getDataRange().getValues();
    Logger.log('Data length for ' + sheetName + ': ' + data.length);

    if (user.asalSekolah === 'YPWI LUTIM') {
      return data.slice(1);
    } else {
    return data.slice(1).filter(function(row) {
      return row[10] === user.asalSekolah; // Kolom 10: Asal Sekolah
    });
    }
  } catch (error) {
    Logger.log('Error in getFilteredData: ' + error.toString());
    return [];
  }
}

function getDashboardData() {
  var user = getUserFromSession();
  if (!user) return {};

  var absensiData = getFilteredData('Absensi');
  var databaseData = getFilteredData('Database');

  // Hitung statistik
  var totalHadir = 0, totalSakit = 0, totalAlpa = 0;
  absensiData.forEach(function(row) {
    if (row[6] === 'Hadir') totalHadir++; // Kolom 6: Status
    else if (row[6] === 'Sakit') totalSakit++;
    else if (row[6] === 'Alpa') totalAlpa++;
  });

  // Ranking top 10 guru (simulasi berdasarkan hadir)
  var guruStats = {};
  databaseData.forEach(function(guru) {
    guruStats[guru[0]] = { nama: guru[1], hadir: 0 };
  });
  absensiData.forEach(function(abs) {
    if (guruStats[abs[0]]) guruStats[abs[0]].hadir++;
  });
  var ranking = Object.values(guruStats).sort((a,b) => b.hadir - a.hadir).slice(0,10);

  return {
    totalHadir: totalHadir,
    totalSakit: totalSakit,
    totalAlpa: totalAlpa,
    ranking: ranking
  };
}

function calculatePayroll(month, year) {
  var user = getUserFromSession();
  if (!user) return [];

  var absensiData = getFilteredData('Absensi');
  var databaseData = getFilteredData('Database');
  var payrollData = getFilteredData('Payroll');

  var payroll = [];
  databaseData.forEach(function(guru) {
    var id = guru[0];
    var nama = guru[1];
    var gajiPokok = guru[13] || 0; // Kolom Gaji Pokok
    var tunjangan = guru[14] || 0; // Kolom Tunjangan

    // Hitung absensi untuk bulan tersebut
    var hadir = 0, terlambat = 0, pulangCepat = 0;
    absensiData.forEach(function(abs) {
      var date = new Date(abs[1]); // Asumsikan kolom tanggal
      if (date.getMonth() === month - 1 && date.getFullYear() === year) {
        if (abs[0] === id) {
          if (abs[6] === 'Hadir') hadir++; // Kolom 6: Status
          else if (abs[6] === 'Terlambat') terlambat++;
          else if (abs[6] === 'Pulang Cepat') pulangCepat++;
        }
      }
    });

    // Potongan: jumlah terlambat * potongan per terlambat
    var potongan = terlambat * 50000; // Asumsikan potongan 50k per terlambat
    var uangMakan = hadir * 15000; // 15k per hadir

    var gajiBersih = (gajiPokok + tunjangan) - potongan + uangMakan;

    payroll.push({
      id: id,
      nama: nama,
      hadir: hadir,
      terlambat: terlambat,
      pulangCepat: pulangCepat,
      gajiPokok: gajiPokok,
      tunjangan: tunjangan,
      potongan: potongan,
      uangMakan: uangMakan,
      gajiBersih: gajiBersih
    });
  });

  return payroll;
}

function sendWASlip(id, month, year) {
  // Integrasi Whacenter
  var payroll = calculatePayroll(month, year);
  var employee = payroll.find(p => p.id == id);
  if (!employee) return false;

  // Ambil nomor WA dari Database (asumsikan kolom 5: nomor WA)
  var databaseData = getFilteredData('Database');
  var guru = databaseData.find(g => g[0] == id);
  if (!guru || !guru[5]) return false; // Tidak ada nomor WA

  var message = `Slip Gaji ${month}/${year}\nNama: ${employee.nama}\nGaji Bersih: Rp ${employee.gajiBersih.toLocaleString()}`;

  var deviceId = "YOUR_DEVICE_ID"; // Ganti dengan Device ID Whacenter Anda
  var formdata = {
    "device_id": deviceId,
    "number": guru[5], // Nomor WA
    "message": message
  };
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(formdata)
  };

  try {
    UrlFetchApp.fetch("https://app.whacenter.com/api/send", options);
    return true;
  } catch (e) {
    Logger.log(e);
    return false;
  }
}

function getPageHtml(page) {
  Logger.log('getPageHtml called for page: ' + page);
  try {
    var template = HtmlService.createTemplateFromFile('Page_' + page.charAt(0).toUpperCase() + page.slice(1));
    var html = template.evaluate().getContent();
    Logger.log('getPageHtml successful for: ' + page);
    return html;
  } catch (error) {
    Logger.log('Error in getPageHtml: ' + error.toString());
    return '<h1>Error loading page: ' + page + '</h1><p>' + error.toString() + '</p>';
  }
}

function updateDatabase(data) {
  var user = getUserFromSession();
  if (!user || user.jabatan !== 'Admin') return false; // Hanya admin bisa edit

  var sheet = SpreadsheetApp.openById('16oU2LIbN1R64IeRXDW2kZQV2pukqWTo3wcZcUID3YXY').getSheetByName('Database');
  // Update logic
  return true;
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('YPWI Dashboard')
    .addItem('Buka Dashboard', 'openDashboard')
    .addToUi();
}

function openDashboard() {
  var html = HtmlService.createHtmlOutput('<script>window.open("YOUR_WEB_APP_URL", "_blank");</script>');
  SpreadsheetApp.getUi().showModalDialog(html, 'Loading Dashboard...');
}

function test() {
  // Test akses Sheets
  var sheet = SpreadsheetApp.openById('16oU2LIbN1R64IeRXDW2kZQV2pukqWTo3wcZcUID3YXY').getSheetByName('Database');
  var data = sheet.getDataRange().getValues();
  Logger.log('Data Database: ' + data.length + ' rows');
  return 'Test akses Sheets berhasil. Data: ' + data.length + ' rows.';
}

function testLogin() {
  // Test login dengan ID dan password contoh
  var user = login('contoh_id', 'contoh_password');
  Logger.log('Login test: ' + (user ? 'Berhasil' : 'Gagal'));
  return user ? 'Login berhasil: ' + user.nama : 'Login gagal';
}

function testPayroll() {
  // Test kalkulasi payroll untuk bulan 1 tahun 2026
  var payroll = calculatePayroll(1, 2026);
  Logger.log('Payroll test: ' + payroll.length + ' entries');
  return 'Payroll test: ' + payroll.length + ' entries.';
}