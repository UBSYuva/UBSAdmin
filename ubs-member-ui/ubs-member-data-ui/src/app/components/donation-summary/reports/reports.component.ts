import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-donation-reports',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="row g-4">
      <div class="col-md-6" *ngFor="let report of reports">
        <div class="card border-0 shadow-sm h-100 hover-lift">
          <div class="card-body p-4 d-flex align-items-start">
            <div class="icon-box me-3">
              <i [class]="'bi ' + report.icon"></i>
            </div>
            <div class="flex-grow-1">
                <h6 class="fw-bold mb-1 text-dark">{{report.title}}</h6>
                <p class="text-muted small mb-3">{{report.desc}}</p>
                <button class="btn btn-sm btn-light border">
                    <i class="bi bi-download me-1"></i> Download PDF
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #f8fafc;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .hover-lift {
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
    }
    .hover-lift:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
    }
  `]
})
export class DonationReportsComponent {
    reports = [
        { title: 'Annual Financial Report', desc: 'Comprehensive yearly summary of all donations and expenses.', icon: 'bi-file-earmark-bar-graph' },
        { title: 'Tax Exemption Summary', desc: 'Detailed list of 80G eligible donations for the fiscal year.', icon: 'bi-shield-check' },
        { title: 'Donor Demographics', desc: 'Insight into regional distribution and donor frequency.', icon: 'bi-people' },
        { title: 'Monthly Growth Trends', desc: 'Comparison of donation volume month-over-month.', icon: 'bi-graph-up-arrow' }
    ];
}
