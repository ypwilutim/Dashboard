const GAS_URL = 'https://script.google.com/macros/s/AKfycbyiAMJVUP0oSFHwDl39GVSxeVfc28zG2s4QMb0cZvYNXcroaHv3p5iua2bdcvJq2i-UYw/exec';

window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').style.display = 'none';
  }, 800);
});

function callGAS(functionName, parameters = {}) {
  const params = new URLSearchParams();
  params.append('function', functionName);
  params.append('parameters', JSON.stringify(parameters));

  return fetch(GAS_URL + '?' + params.toString())
    .then(response => response.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      return data.response;
    });
}

function loadPage(page) {
  const viewport = document.getElementById('content');
  viewport.classList.remove('animate__fadeIn');
  viewport.classList.add('animate__fadeOut');

  setTimeout(() => {
    if (page === 'dashboard') {
      loadDashboard();
    } else if (page === 'database') {
      loadDatabase();
    } else if (page === 'payroll') {
      loadPayroll();
    } else if (page === 'auth') {
      loadAuth();
    }
    viewport.classList.remove('animate__fadeOut');
    viewport.classList.add('animate__fadeIn');
  }, 300);
}

function loadAuth() {
  document.getElementById('content').innerHTML = `
    <div class="container">
      <div class="row justify-content-center mt-5">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header text-center">
              <h4>Login YPWI Hub</h4>
            </div>
            <div class="card-body">
              <form id="loginForm">
                <div class="mb-3">
                  <label for="id" class="form-label">ID</label>
                  <input type="text" class="form-control" id="id" required>
                </div>
                <div class="mb-3">
                  <label for="password" class="form-label">Password</label>
                  <input type="password" class="form-control" id="password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Login</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var id = document.getElementById('id').value;
    var password = document.getElementById('password').value;

    callGAS('login', {id: id, password: password}).then(user => {
      if (user) {
        document.getElementById('user-id').textContent = 'ID: ' + user.id;
        document.getElementById('user-school').textContent = 'Unit: ' + user.asalSekolah;
        loadPage('dashboard');
      } else {
        alert('Invalid credentials');
      }
    }).catch(error => {
      alert('Login error: ' + error.message);
    });
  });
}

function loadDashboard() {
  callGAS('getDashboardData').then(data => {
    document.getElementById('content').innerHTML = `
      <div class="row g-4 mb-5">
        <div class="col-lg-3 col-md-6 mb-4">
          <div class="stat-card h-100">
            <div class="text-center">
              <i class="fas fa-user-check fa-2x mb-3" style="color: #00b894;"></i>
              <p class="text-muted small fw-bold">TOTAL HADIR</p>
              <h3>${data.totalHadir} <span class="badge bg-soft-success text-success fs-6" style="background: #dcfce7;">+12%</span></h3>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-4">
          <div class="stat-card h-100">
            <div class="text-center">
              <i class="fas fa-clock fa-2x mb-3" style="color: #fdcb6e;"></i>
              <p class="text-muted small fw-bold">TERLAMBAT</p>
              <h3>${data.totalSakit} <span class="badge bg-soft-danger text-danger fs-6" style="background: #fee2e2;">-2%</span></h3>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-4">
          <div class="stat-card h-100">
            <div class="text-center">
              <i class="fas fa-user-times fa-2x mb-3" style="color: #e17055;"></i>
              <p class="text-muted small fw-bold">SAKIT</p>
              <h3>${data.totalSakit}</h3>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-4">
          <div class="stat-card h-100">
            <div class="text-center">
              <i class="fas fa-user-slash fa-2x mb-3" style="color: #d63031;"></i>
              <p class="text-muted small fw-bold">ALPA</p>
              <h3>${data.totalAlpa}</h3>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-lg-6 mb-4">
          <div class="table-container h-100">
            <div class="d-flex justify-content-between mb-4">
              <h5><i class="fas fa-chart-pie"></i> Statistik Kehadiran</h5>
            </div>
            <canvas id="attendanceChart"></canvas>
          </div>
        </div>
        <div class="col-lg-6 mb-4">
          <div class="table-container h-100">
            <div class="d-flex justify-content-between mb-4">
              <h5><i class="fas fa-star"></i> Top 10 Guru</h5>
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead class="table-light">
                  <tr>
                    <th>Nama</th>
                    <th>Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.ranking.map(g => `<tr><td>${g.nama}</td><td>${g.hadir}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load Chart
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Hadir', 'Sakit', 'Alpa'],
        datasets: [{
          data: [data.totalHadir, data.totalSakit, data.totalAlpa],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      }
    });
  }).catch(error => {
    document.getElementById('content').innerHTML = '<h1>Error loading dashboard</h1>';
    console.error(error);
  });
}

function loadDatabase() {
  callGAS('getFilteredData', {sheetName: 'Database'}).then(data => {
    document.getElementById('content').innerHTML = `
      <div class="table-container">
        <div class="d-flex justify-content-between mb-4">
          <h5><i class="fas fa-users"></i> Database Guru/Staf</h5>
          <button class="btn btn-outline-primary btn-sm btn-custom">Tambah Baru</button>
        </div>
        <div class="table-responsive">
          <table class="table table-hover">
            <thead class="table-light">
              <tr>
                <th>ID</th>
                <th>Nama</th>
                <th>Jabatan</th>
                <th>Asal Sekolah</th>
                <th>No. WA</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `<tr>
                <td>${row[0]}</td>
                <td>${row[1]}</td>
                <td>${row[12]}</td>
                <td>${row[10]}</td>
                <td>${row[8]}</td>
                <td><span class="status-pill bg-success text-white">Aktif</span></td>
                <td><button class="btn btn-sm btn-primary">Edit</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).catch(error => {
    document.getElementById('content').innerHTML = '<h1>Error loading database</h1>';
    console.error(error);
  });
}

function loadPayroll() {
  document.getElementById('content').innerHTML = `
    <div class="table-container mb-4">
      <div class="row">
        <div class="col-md-6 mb-3">
          <label for="month" class="form-label">Bulan</label>
          <select class="form-select" id="month">
            <option value="1">Januari</option>
            <option value="2">Februari</option>
            <option value="3">Maret</option>
            <option value="4">April</option>
            <option value="5">Mei</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">Agustus</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>
        <div class="col-md-6 mb-3">
          <label for="year" class="form-label">Tahun</label>
          <input type="number" class="form-control" id="year" value="2026">
        </div>
      </div>
      <button class="btn btn-primary btn-custom" onclick="calculatePayroll()">Hitung Payroll</button>
    </div>
    <div class="table-container" id="payroll-result"></div>
  `;
}

function calculatePayroll() {
  var month = document.getElementById('month').value;
  var year = document.getElementById('year').value;

  callGAS('calculatePayroll', {month: month, year: year}).then(data => {
    document.getElementById('payroll-result').innerHTML = `
      <div class="d-flex justify-content-between mb-4">
        <h5>Hasil Payroll</h5>
      </div>
      <table class="table">
        <thead class="table-light">
          <tr>
            <th>Nama</th>
            <th>Hadir</th>
            <th>Terlambat</th>
            <th>Pulang Cepat</th>
            <th>Gaji Bersih</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(p => `<tr><td>${p.nama}</td><td>${p.hadir}</td><td>${p.terlambat}</td><td>${p.pulangCepat}</td><td>Rp ${p.gajiBersih.toLocaleString()}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }).catch(error => {
    document.getElementById('payroll-result').innerHTML = '<h1>Error calculating payroll</h1>';
    console.error(error);
  });
}

function logout() {
  // Clear session and reload
  location.reload();
}

// Load auth on start
loadPage('auth');