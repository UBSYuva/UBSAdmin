import { Component, inject, signal, TemplateRef, ViewChild, WritableSignal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of, tap } from 'rxjs';
import { MemberService } from '~/services/member.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-donation-overview',
    standalone: true,
    imports: [CommonModule],
    template: `
<!-- Loader -->
<div *ngIf="loading" class="loader-container">
    <div class="loader"></div>
</div>

<!-- Summary Section -->
<div class="row g-4 mt-1">
    <ng-container *ngFor="let summary of donationSummary; let i = index">
        <!-- Main Year Card -->
        <div class="col-12 mb-2">
            <div class="year-header d-flex align-items-center gap-2 mb-3">
                <i class="bi bi-calendar-check text-primary fs-4"></i>
                <h4 class="mb-0 fw-bold text-dark">Donation Year {{ summary.monthName }}, {{ summary.year || 'N/A' }}</h4>
                <div class="flex-grow-1 border-bottom ms-2 opacity-50"></div>
            </div>
            
            <div class="row g-3">
                <!-- Total Entries Card -->
                <div class="col-md-4">
                    <div class="stat-card entries">
                        <div class="card-icon">
                            <i class="bi bi-people"></i>
                        </div>
                        <div class="card-info">
                            <span class="label">Total Entries</span>
                            <h3 class="value">{{ summary.totalEntries || 0 }}</h3>
                        </div>
                        <div class="card-bg-icon">
                            <i class="bi bi-people"></i>
                        </div>
                    </div>
                </div>

                <!-- Total Donation Card -->
                <div class="col-md-4">
                    <div class="stat-card amount">
                        <div class="card-icon">
                            <i class="bi bi-currency-rupee"></i>
                        </div>
                        <div class="card-info">
                            <span class="label">Total Donation</span>
                            <h3 class="value">₹ {{ (summary.totalDonation || 0).toLocaleString() }}</h3>
                        </div>
                        <div class="card-bg-icon">
                            <i class="bi bi-wallet2"></i>
                        </div>
                    </div>
                </div>

                <!-- Avg. Donation Card -->
                <div class="col-md-4">
                    <div class="stat-card average text-white">
                        <div class="card-icon">
                            <i class="bi bi-graph-up-arrow"></i>
                        </div>
                        <div class="card-info">
                            <span class="label">Average Donation</span>
                            <h3 class="value">₹ {{ (summary.avgDonation || 0).toFixed(2) }}</h3>
                        </div>
                        <div class="card-bg-icon">
                            <i class="bi bi-pie-chart"></i>
                        </div>
                    </div>
                </div>

                <!-- UBS Total Card -->
                <div class="col-md-6">
                    <div class="stat-card ubs-funds">
                        <div class="card-icon">
                            <i class="bi bi-bank"></i>
                        </div>
                        <div class="card-info">
                            <span class="label">UBS Total</span>
                            <h3 class="value text-primary font-numeric">₹ {{ (summary.ubsTotal || 0).toLocaleString() }}</h3>
                        </div>
                        <div class="card-bg-icon">
                            <i class="bi bi-bank"></i>
                        </div>
                    </div>
                </div>

                <!-- UBS Trust Total Card -->
                <div class="col-md-6">
                    <div class="stat-card trust-funds">
                        <div class="card-icon">
                            <i class="bi bi-shield-check"></i>
                        </div>
                        <div class="card-info">
                            <span class="label">UBS Trust Total</span>
                            <h3 class="value text-purple font-numeric">₹ {{ (summary.ubsTrustTotal || 0).toLocaleString() }}</h3>
                        </div>
                        <div class="card-bg-icon">
                            <i class="bi bi-shield-check"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </ng-container>
</div>

<style>
    .year-header {
        padding-bottom: 5px;
    }
    .stat-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        gap: 20px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        border: 1px solid rgba(0,0,0,0.02);
        height: 100%;
    }
    .stat-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    .stat-card .card-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        z-index: 2;
    }
    .stat-card .card-info {
        z-index: 2;
    }
    .stat-card .label {
        color: #64748b;
        font-size: 14px;
        font-weight: 500;
        display: block;
        margin-bottom: 4px;
    }
    .stat-card .value {
        margin: 0;
        font-weight: 700;
        color: #1e293b;
        font-size: 24px;
    }
    .stat-card .card-bg-icon {
        position: absolute;
        right: -10px;
        bottom: -10px;
        font-size: 80px;
        opacity: 0.03;
        z-index: 1;
        transform: rotate(-15deg);
    }

    /* Card Themes */
    .stat-card.entries .card-icon {
        background: #eff6ff;
        color: #3b82f6;
    }
    .stat-card.amount .card-icon {
        background: #ecfdf5;
        color: #10b981;
    }
    .stat-card.average {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: white;
    }
    .stat-card.average .card-icon {
        background: rgba(255,255,255,0.2);
        color: white;
    }
    .stat-card.average .label {
        color: rgba(255,255,255,0.8);
    }
    .stat-card.average .value {
        color: white;
    }
    .stat-card.ubs-funds .card-icon {
        background: #e0f2fe;
        color: #0369a1;
    }
    .stat-card.trust-funds .card-icon {
        background: #faf5ff;
        color: #7e22ce;
    }
    .font-numeric {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        letter-spacing: -0.5px;
    }
</style>
    `,
    styleUrl: '../donation-summary.component.scss'
})
export class DonationOverviewComponent implements OnInit {

    loading = false;
    donationSummary: any[] = [];

    private memberDataService = inject(MemberService);

    async ngOnInit() {
        this.getTotalDonationSummary();
    }

    getTotalDonationSummary() {
        this.loading = true;
        this.memberDataService.getTotalDonation()
            .pipe(
                tap(data => {
                    if ((data || []).length > 0) {
                        this.donationSummary = data.map(item => ({
                            ...item,
                            avgDonation: Number(item.avgDonation || (item.totalEntries && item.totalDonation ? item.totalDonation / item.totalEntries : 0)),
                            totalDonation: Number(item.totalDonation || 0),
                            totalEntries: Number(item.totalEntries || 0),
                            ubsTotal: Number(item.ubsTotal || 0),
                            ubsTrustTotal: Number(item.ubsTrustTotal || 0)
                        }));
                    } else {
                        this.donationSummary = [{
                            totalDonation: 0,
                            totalEntries: 0,
                            avgDonation: 0,
                            year: null
                        }];
                    }
                    this.loading = false;
                })
            ).subscribe();
    }
}
