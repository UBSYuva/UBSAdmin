import { Component, inject, OnInit } from '@angular/core';
import { MemberService } from '~/services/member.service';
import { ExportService } from '~/services/export.service';
import { finalize } from 'rxjs';
import * as moment from 'moment';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private memberService = inject(MemberService);
  private exportService = inject(ExportService);

  loading = false;
  allMembers: any[] = [];
  ageLimit = 40;
  isOnline = navigator.onLine;
  userRole = '';

  // New combined filters
  activeAgeTab: 'below' | 'above' = 'below';
  selectedGender: 'all' | 'male' | 'female' = 'all';

  ngOnInit() {
    this.userRole = localStorage.getItem('user-role') || 'admin';
    this.loadData();
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  loadData() {
    this.loading = true;
    this.memberService.getMemberMaster()
      .pipe(finalize(() => this.loading = false))
      .subscribe(data => {
        // Only show records with Name, Mobile, or DOB
        this.allMembers = (data || []).filter(m => 
          (m.Name || m.name) && 
          (m.Mobile || m.mobile) && 
          (m.dob || m['Date Of Birth'])
        );
      });
  }

  calculateAge(dob: any): number {
    if (!dob) return 0;
    const m = moment(dob);
    if (!m.isValid()) return 0;
    return moment().diff(m, 'years');
  }

  get filteredMembers() {
    return this.allMembers.filter(m => {
      const age = this.calculateAge(m.dob || m['Date Of Birth']);
      const gender = (m.Gender || m.gender || '').toLowerCase();
      
      // Apply Age Filter
      const matchesAge = this.activeAgeTab === 'below' ? age < this.ageLimit : age >= this.ageLimit;
      if (!matchesAge) return false;
      
      // Apply Gender Filter
      if (this.selectedGender !== 'all') {
        if (gender !== this.selectedGender) return false;
      }
      
      return true;
    });
  }

  downloadCurrentReport() {
    const list = this.filteredMembers;
    if (!list || list.length === 0) return;
    
    const title = `Members-${this.activeAgeTab}-${this.ageLimit}-Gender-${this.selectedGender}`;
    
    const exportData = list.map(m => ({
      'Member ID': m['Member Id'] || m.memberId || '',
      'Name': m.Name || m.name || '',
      'DOB': moment(m.dob || m['Date Of Birth']).format('YYYY-MM-DD'),
      'Age': this.calculateAge(m.dob || m['Date Of Birth']),
      'Gender': m.Gender || m.gender || '',
      'Mobile No.': m.Mobile || m.mobile || ''
    }));

    this.exportToExcel(exportData, title);
  }

  printCurrentReport() {
    const list = this.filteredMembers;
    if (!list || list.length === 0) return;

    const limitText = this.activeAgeTab === 'below' ? `Below ${this.ageLimit}` : `${this.ageLimit} & Above`;
    const genderText = this.selectedGender === 'all' ? 'All Genders' : this.selectedGender.charAt(0).toUpperCase() + this.selectedGender.slice(1);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRows = '';
    list.forEach(m => {
      tableRows += `
        <tr>
          <td>${m['Member Id'] || m.memberId || '-'}</td>
          <td>${m.Name || m.name}</td>
          <td>${this.calculateAge(m.dob || m['Date Of Birth'])}</td>
          <td>${m.Gender || m.gender || '-'}</td>
          <td>${moment(m.dob || m['Date Of Birth']).format('YYYY-MM-DD')}</td>
          <td>${m.Mobile || m.mobile || '-'}</td>
        </tr>
      `;
    });

    const html = `
      <html>
        <head>
          <title>UBS Report - ${limitText} - ${genderText}</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            @media print {
              .no-print { display: none; }
              body { font-family: 'Inter', sans-serif; padding: 20px; }
              table { font-size: 11px; }
              thead { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
              .header-section { border-bottom: 2px solid #4f46e5; margin-bottom: 30px; padding-bottom: 15px; }
              .logo-placeholder { font-size: 24px; color: #4f46e5; font-weight: bold; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header-section d-flex justify-content-between align-items-center">
            <div>
                <h1 class="h3 fw-bold mb-0 text-indigo">UBS SEVA TRUST</h1>
                <p class="text-muted small mb-0">Members Demographic Analysis Report</p>
            </div>
            <div class="text-end">
                <div class="fw-bold fs-5 text-indigo">Demographic Analysis</div>
                <div class="text-muted small">Generated on: ${moment().format('DD/MM/YYYY HH:mm:ss')}</div>
            </div>
          </div>
          
          <div class="mb-4">
            <span class="badge bg-light text-dark border p-2 me-2">Age: ${limitText}</span>
            <span class="badge bg-light text-dark border p-2 me-2">Gender: ${genderText}</span>
            <span class="badge bg-light text-dark border p-2 me-2">Total Count: ${list.length}</span>
          </div>

          <table class="table table-bordered table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>DOB</th>
                <th>Mobile</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="mt-4 text-center text-muted small border-top pt-2">
            This is an automatically generated report from the UBS Seva Trust Member Management System.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  private exportToExcel(data: any[], fileName: string) {
    const table = document.createElement('table');
    table.id = 'temp-report-table';
    table.style.display = 'none';
    
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const headerRow = table.insertRow();
    headers.forEach(h => {
      const th = document.createElement('th');
      th.innerText = h;
      headerRow.appendChild(th);
    });
    
    data.forEach(item => {
      const row = table.insertRow();
      headers.forEach(h => {
        const cell = row.insertCell();
        cell.innerText = item[h] || '';
      });
    });
    
    document.body.appendChild(table);
    this.exportService.exportToExcel(table.id, fileName);
    document.body.removeChild(table);
  }
}
