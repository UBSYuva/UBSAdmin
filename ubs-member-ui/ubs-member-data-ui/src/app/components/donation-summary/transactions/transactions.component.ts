import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberService } from '~/services/member.service';
import { Observable, tap, of } from 'rxjs';
import { ToastService } from '~/services/toast-service';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

import { FormsModule } from '@angular/forms';
@Component({
    selector: 'app-donation-transactions',
    standalone: true,
    imports: [CommonModule, FormsModule, NgbPaginationModule],
    template: `
<div *ngIf="loading" class="loader-container">
    <div class="loader"></div>
</div>

<div class="card border-0 shadow-sm bg-white p-4 main-transaction-card">
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 header-section">
        <div>
            <h5 class="m-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i class="bi bi-list-task text-primary"></i>
                Donation Transactions
            </h5>
            <p class="text-muted small mb-0 mt-1">Detailed view of all donations for the selected period</p>
        </div>
        
        <div class="d-flex align-items-center gap-3 filter-controls">
            <div class="select-wrapper">
                <span class="label">Select Year</span>
                <select class="form-select form-select-sm custom-select" [(ngModel)]="selectedYear" (change)="onFilterChange()">
                    <option *ngFor="let year of uniqueYears" [value]="year">{{year}}</option>
                </select>
            </div>
            <div class="select-wrapper">
                <span class="label">Select Month</span>
                <select class="form-select form-select-sm custom-select" [(ngModel)]="selectedMonth" (change)="onFilterChange()">
                    <option *ngFor="let m of months" [value]="m.value">{{m.label}}</option>
                </select>
            </div>
            <div class="select-wrapper">
                <span class="label">Donation Type</span>
                <select class="form-select form-select-sm custom-select" [(ngModel)]="selectedDonationType" (change)="onFilterChange()">
                    <option value="">All Types</option>
                    <option value="UBS">UBS</option>
                    <option value="UBS Trust">UBS Trust</option>
                </select>
            </div>
        </div>
    </div>

    <div class="table-responsive custom-table-container">
        <table class="table table-hover align-middle">
            <thead>
                <tr>
                    <th scope="col" class="text-center">#</th>
                    <th scope="col" style="cursor: pointer;" (click)="onSort('Member Id')">
                        Member Id
                        <i class="bi" [ngClass]="{'bi-sort-alpha-down': sortColumn === 'Member Id' && sortDirection === 'asc', 'bi-sort-alpha-up': sortColumn === 'Member Id' && sortDirection === 'desc', 'bi-arrow-down-up': sortColumn !== 'Member Id'}" class="sort-icon"></i>
                    </th>
                    <th scope="col" style="cursor: pointer;" (click)="onSort('Name')">
                        Donar Name
                        <i class="bi" [ngClass]="{'bi-sort-alpha-down': sortColumn === 'Name' && sortDirection === 'asc', 'bi-sort-alpha-up': sortColumn === 'Name' && sortDirection === 'desc', 'bi-arrow-down-up': sortColumn !== 'Name'}" class="sort-icon"></i>
                    </th>
                    <th scope="col" style="cursor: pointer;" (click)="onSort('City')">
                        City
                        <i class="bi" [ngClass]="{'bi-sort-alpha-down': sortColumn === 'City' && sortDirection === 'asc', 'bi-sort-alpha-up': sortColumn === 'City' && sortDirection === 'desc', 'bi-arrow-down-up': sortColumn !== 'City'}" class="sort-icon"></i>
                    </th>
                    <th scope="col" style="cursor: pointer;" (click)="onSort('PaymentDate')">
                        Payment Date
                        <i class="bi" [ngClass]="{'bi-sort-numeric-down': sortColumn === 'PaymentDate' && sortDirection === 'asc', 'bi-sort-numeric-up': sortColumn === 'PaymentDate' && sortDirection === 'desc', 'bi-arrow-down-up': sortColumn !== 'PaymentDate'}" class="sort-icon"></i>
                    </th>
                    <th scope="col" class="text-center">Method</th>
                    <th scope="col" class="text-center">Type</th>
                    <th scope="col" class="text-end" style="cursor: pointer;" (click)="onSort('Amount')">
                        Amount
                        <i class="bi" [ngClass]="{'bi-sort-numeric-down': sortColumn === 'Amount' && sortDirection === 'asc', 'bi-sort-numeric-up': sortColumn === 'Amount' && sortDirection === 'desc', 'bi-arrow-down-up': sortColumn !== 'Amount'}" class="sort-icon"></i>
                    </th>
                    <th scope="col" class="text-center">Action</th>
                </tr>
            </thead>
            <tbody>
                <tr *ngFor="let donation of donationData$ | async; let i = index" class="transaction-row">
                    <td class="text-center text-muted small">{{ (page - 1) * pageSize + i + 1 }}</td>
                    <td class="fw-bold text-primary small">{{ donation['Member Id'] }}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-sm me-3" [style.background-color]="getAvatarColor(donation.Name)">
                                {{donation.Name ? donation.Name.charAt(0) : '?'}}
                            </div>
                            <div>
                                <div class="fw-bold text-dark">{{ donation.Name }}</div>
                                <div class="text-muted extra-small">{{ donation.Mobile }}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-1">
                            <i class="bi bi-geo-alt text-muted"></i>
                            {{ donation.City }}
                        </div>
                    </td>
                    <td>
                        <div class="d-flex flex-column">
                            <span class="fw-medium">{{ donation.PaymentDate | date: 'dd MMM, yyyy' }}</span>
                            <span class="text-muted extra-small">Ref: {{ donation.PaymentNo || 'N/A' }}</span>
                        </div>
                    </td>
                    <td class="text-center">
                        <span class="payment-badge" [ngClass]="donation.PaymentType ? donation.PaymentType.toLowerCase() : ''">
                            {{ donation.PaymentType }}
                        </span>
                    </td>
                    <td class="text-center">
                        <span *ngIf="donation.DonationType" class="type-badge" [ngClass]="donation.DonationType.toLowerCase().replace(' ', '-')">
                            {{ donation.DonationType }}
                        </span>
                    </td>
                    <td class="text-end">
                        <span class="amount-text">₹{{ donation.Amount ? donation.Amount.toLocaleString() : '0' }}</span>
                    </td>
                    <td class="text-center">
                        <div class="action-buttons">
                            <button class="btn-action delete" (click)="onDelete(donation)" title="Delete Transaction">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr *ngIf="!(donationData$ | async)?.length">
                    <td colspan="9" class="text-center py-5 empty-state">
                        <div class="empty-icon-wrapper">
                            <i class="bi bi-clipboard-x fs-1"></i>
                        </div>
                        <h6 class="mt-3 fw-bold">No transactions found</h6>
                        <p class="text-muted small">We couldn't find any donation records for {{selectedYear}}</p>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Pagination Section -->
    <div class="d-flex justify-content-between align-items-center mt-3 p-2 bg-white rounded shadow-sm border flex-wrap gap-2">
        <div class="text-muted small ms-2 d-flex align-items-center gap-2">
            Showing {{ collectionSize > 0 ? (page - 1) * pageSize + 1 : 0 }} to {{ Math.min(page * pageSize, collectionSize) }} of {{ collectionSize }} entries
            <select class="form-select form-select-sm w-auto ms-2" [(ngModel)]="pageSize" (change)="onPageSizeChange()">
                <option [ngValue]="10">10 / page</option>
                <option [ngValue]="25">25 / page</option>
                <option [ngValue]="50">50 / page</option>
                <option [ngValue]="100">100 / page</option>
            </select>
        </div>
        <div class="d-flex align-items-center gap-3">
            <div class="d-flex align-items-center gap-1 small text-muted">
                <span>Go to:</span>
                <input type="number" class="form-control form-control-sm text-center" style="width: 65px;" [min]="1" [max]="Math.ceil(collectionSize / pageSize) || 1" #pageInput (keyup.enter)="jumpToPage(pageInput.value)" (blur)="jumpToPage(pageInput.value)" [value]="page">
                <span>/ {{ Math.ceil(collectionSize / pageSize) || 1 }}</span>
                <button class="btn btn-sm btn-outline-secondary py-0 px-2 ms-1" (click)="jumpToPage(pageInput.value)">Go</button>
            </div>

            <ngb-pagination [(page)]="page" [pageSize]="pageSize" [collectionSize]="collectionSize"
                (pageChange)="updateTransactions()" [maxSize]="5" [rotate]="true" [boundaryLinks]="true" [ellipses]="true" class="mb-0">
            </ngb-pagination>
        </div>
    </div>
</div>

<style>
    .main-transaction-card {
        border-radius: 20px;
    }
    .extra-small {
        font-size: 11px;
    }
    .avatar-sm {
        width: 36px;
        height: 36px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        font-weight: 700;
        font-size: 0.9rem;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .select-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .select-wrapper .label {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .custom-select {
        border-radius: 10px;
        border: 1.5px solid #e2e8f0;
        padding: 8px 32px 8px 16px;
        font-weight: 600;
        color: #1e293b;
        background-color: #f8fafc;
        transition: all 0.2s;
    }
    .custom-select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .custom-table-container {
        border: 1px solid #f1f5f9;
        border-radius: 15px;
        overflow: hidden;
    }
    .table thead th {
        background: #f8fafc;
        border-bottom: 2px solid #f1f5f9;
        color: #64748b;
        font-weight: 600;
        font-size: 13px;
        padding: 16px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .transaction-row {
        transition: all 0.2s;
        border-bottom: 1px solid #f8fafc;
    }
    .transaction-row:hover {
        background-color: #f1f5f9;
        transform: scale(1.002);
    }
    .transaction-row td {
        padding: 16px;
        color: #475569;
    }
    .sort-icon {
        font-size: 0.8rem;
        margin-left: 6px;
        color: #cbd5e1;
    }
    .payment-badge {
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        display: inline-block;
        text-transform: capitalize;
    }
    .payment-badge.cash { background: #dcfce7; color: #166534; }
    .payment-badge.online { background: #dbeafe; color: #1e40af; }
    .payment-badge.cheque { background: #fef3c7; color: #92400e; }
    .type-badge {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        display: inline-block;
    }
    .type-badge.ubs { background: #e0f2fe; color: #0369a1; }
    .type-badge.ubs-trust { background: #faf5ff; color: #7e22ce; }
    .amount-text {
        font-weight: 800;
        color: #0f172a;
        font-size: 15px;
    }
    .action-buttons {
        display: flex;
        justify-content: center;
        gap: 8px;
    }
    .btn-action {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        background: #f8fafc;
    }
    .btn-action.delete { color: #ef4444; }
    .btn-action.delete:hover {
        background: #fef2f2;
        transform: rotate(10deg);
    }
    .empty-icon-wrapper {
        width: 80px;
        height: 80px;
        background: #f8fafc;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
        color: #cbd5e1;
    }
</style>
  `,
    styleUrl: '../donation-summary.component.scss'
})
export class DonationTransactionsComponent implements OnInit {
    memberDataService = inject(MemberService);
    toastService = inject(ToastService);

    loading = false;
    donationSummary: any[] = [];
    uniqueYears: string[] = [];
    months = [
        { value: '', label: 'All Months' },
        { value: '0', label: 'January' },
        { value: '1', label: 'February' },
        { value: '2', label: 'March' },
        { value: '3', label: 'April' },
        { value: '4', label: 'May' },
        { value: '5', label: 'June' },
        { value: '6', label: 'July' },
        { value: '7', label: 'August' },
        { value: '8', label: 'September' },
        { value: '9', label: 'October' },
        { value: '10', label: 'November' },
        { value: '11', label: 'December' }
    ];

    transactions: any[] = [];
    donationData$: Observable<any[]> | undefined;
    selectedYear: any = null;
    selectedMonth: any = '';
    selectedDonationType: any = 'UBS';

    sortColumn = 'PaymentDate';
    sortDirection: 'asc' | 'desc' = 'desc';

    page = 1;
    pageSize = 25;
    collectionSize = 0;
    Math = Math;

    ngOnInit() {
        this.loadSummaryAndDefaults();
    }

    loadSummaryAndDefaults() {
        this.loading = true;
        this.memberDataService.getTotalDonation().subscribe(data => {
            this.donationSummary = data;
            // Get unique years for the dropdown
            this.uniqueYears = [...new Set(data.map(item => item.year.toString()))].sort((a,b) => parseInt(b)-parseInt(a));
            
            if (this.uniqueYears.length > 0) {
                this.selectedYear = this.uniqueYears[0];
                this.updateTransactions();
            } else {
                this.loading = false;
            }
        });
    }

    onSort(column: string) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.updateTransactions();
    }

    onFilterChange() {
        this.page = 1;
        this.updateTransactions();
    }

    onPageSizeChange() {
        this.page = 1;
        this.updateTransactions();
    }

    jumpToPage(target: any) {
        const totalPages = Math.ceil(this.collectionSize / this.pageSize) || 1;
        let p = parseInt(target, 10);
        if (isNaN(p)) return;
        if (p < 1) p = 1;
        if (p > totalPages) p = totalPages;
        this.page = p;
        this.updateTransactions();
    }

    updateTransactions() {
        if (!this.selectedYear) return;
        this.loading = true;
        this.memberDataService.getDonationData(
            this.selectedYear,
            this.selectedMonth,
            '',
            '',
            this.selectedDonationType,
            this.page,
            this.pageSize,
            this.sortColumn,
            this.sortDirection
        ).subscribe((res: any) => {
            this.loading = false;
            if (res && res.data) {
                this.transactions = res.data;
                this.collectionSize = res.total;
                this.donationData$ = of(res.data);
            } else if (Array.isArray(res)) {
                this.transactions = res;
                this.collectionSize = res.length;
                this.donationData$ = of(res);
            } else {
                this.transactions = [];
                this.collectionSize = 0;
                this.donationData$ = of([]);
            }
        }, err => {
            this.loading = false;
            this.transactions = [];
            this.collectionSize = 0;
            this.donationData$ = of([]);
        });
    }

    onDelete(donation: any) {
        if (confirm(`Are you sure you want to delete donation entry for ${donation.Name}?`)) {
            this.loading = true;
            this.memberDataService.deleteDonation(donation.id).subscribe((res: any) => {
                const response = typeof res === 'string' ? JSON.parse(res) : res;
                this.toastService.show({ template: response.message || 'Record deleted successfully', classname: 'bg-success text-light', delay: 5000 });
                this.updateTransactions();
            }, error => {
                const errorMsg = error.error?.message || 'Failed to delete donation record.';
                this.toastService.show({ template: errorMsg, classname: 'bg-danger text-light', delay: 5000 });
                this.loading = false;
            });
        }
    }

    getAvatarColor(name: string): string {
        const colors = [
            '#3b82f6', '#10b981', '#6366f1', '#f59e0b',
            '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }
}
