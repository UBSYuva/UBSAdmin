import { Component, inject, signal, TemplateRef, ViewChild, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalDismissReasons, NgbModal, NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';
import { Observable, tap, of, Subject, merge, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { ExportService } from '~/services/export.service';
import { MemberService } from '~/services/member.service';
import { ToastService } from '~/services/toast-service';

@Component({
  selector: 'app-invoice-generator',
  templateUrl: './invoice-generator.component.html',
  styleUrl: './invoice-generator.component.scss'
})
export class InvoiceGeneratorComponent {
  @ViewChild('iCity', { static: true }) iCity: NgbTypeahead | undefined;

  loading = false;
  searchingMember = false;
  loadingTransactions = false;
  todayDate = moment().format('DD/MM/YYYY');

  donationData$: Observable<any[]> | undefined;
  selectedDonarYear: any = null;
  selectedDonarMonth: any = null;
  donationSummary: any[] = [];
  transactions: any[] = [];
  memberForm: FormGroup | undefined;
  openSummaryModal = false;
  expandSummaryDetails = false;

  sortColumn = 'PaymentDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  private modalService: NgbModal = inject(NgbModal);
  private toastService = inject(ToastService);
  private city: any[] = [];
  closeResult: WritableSignal<string> = signal('');

  focusC$ = new Subject<string>();
  clickC$ = new Subject<string>();

  @ViewChild('content', { static: true }) content!: TemplateRef<any>;

  constructor(
    private router: Router,
    private memberDataService: MemberService,
    private exportService: ExportService,
    private formBuilder: FormBuilder) {
  }

  onSignout() {
    localStorage.removeItem('session-timeout');
    this.router.navigate(['/']);
  }

  async ngOnInit() {

    this.memberForm = this.formBuilder.group({
      memberId: [null],
      amount: [0, [Validators.required, Validators.min(1)]],
      name: ['', [Validators.required]],
      mobile: [''],
      donationType: ['UBS', [Validators.required]],
      paymentType: ['રોકડા', [Validators.required]],
      paymentNo: [''],
      city: ['']
    });

    this.memberForm.controls.paymentNo.disable();
    this.getCityMaster();
  }

  searchCity: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.clickC$.pipe(filter(() => !this.iCity?.isPopupOpen()));
    const inputFocus$ = this.focusC$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map((term) =>
        (term === '' ? this.city : this.city.filter((v) => v.toLowerCase().indexOf(term.toLowerCase()) > -1)).slice(0, 1000),
      ),
    );
  };

  getCityMaster() {
    this.memberDataService.getCityMaster()
      .pipe(
        tap(data => {
          const raw = (data || []).map(item => item.city).filter(v => v && v !== 'null');
          this.city = raw;
        })
      ).subscribe();
  }

  getTotalDonationSummary() {
    this.loading = true;
    const todayYmd = moment().format('YYYY-MM-DD');
    this.memberDataService.getTotalDonation('today', todayYmd)
      .pipe(
        tap(data => {
          if ((data || []).length > 0) {
            this.donationSummary = data;
            // Automatically view today's records if summary exists
            const first = data[0];
            this.viewYearwiseSummary(first.year, first.month, 'today', todayYmd);
          }
          else {
            this.donationSummary = [{
              totalDonation: 0,
              totalEntries: 0,
              avgDonation: 0,
              year: new Date().getFullYear(),
              monthName: moment().format('MMMM')
            }];
            this.transactions = [];
            this.donationData$ = of([]);
            this.expandSummaryDetails = true;
          }

          this.loading = false;
          this.open(this.content);
        })
      ).subscribe();
  }

  onSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
  }

  compare(v1: string | number | null | undefined, v2: string | number | null | undefined) {
    if (v1 == null) v1 = '';
    if (v2 == null) v2 = '';

    if (typeof v1 === 'string' && typeof v2 === 'string') {
      const numericV1 = parseFloat(v1);
      const numericV2 = parseFloat(v2);
      if (!isNaN(numericV1) && !isNaN(numericV2) && v1.match(/^\d+/) && v2.match(/^\d+/)) {
        return numericV1 < numericV2 ? -1 : numericV1 > numericV2 ? 1 : 0;
      }
      return v1.localeCompare(v2, undefined, { numeric: true, sensitivity: 'base' });
    }
    return (v1 as any) < (v2 as any) ? -1 : (v1 as any) > (v2 as any) ? 1 : 0;
  }

  applySort() {
    if (this.sortColumn) {
      this.transactions.sort((a, b) => {
        const res = this.compare(a[this.sortColumn], b[this.sortColumn]);
        return this.sortDirection === 'asc' ? res : -res;
      });
    }
    this.donationData$ = of([...this.transactions]);
  }

  onSubmit() {
    const req = this.memberForm?.getRawValue();
    this.downloadSlip(req, 'Donation generated and added successfully!', false);
  }

  onReset(): void {
    this.memberForm!.reset();
    this.memberForm?.patchValue({
      paymentType: 'રોકડા',
      donationType: 'UBS',
      amount: 0
    })
  }

  exportTableData(): void {
    this.memberDataService.downloadDonationData();
  }

  async openSummary() {
    this.expandSummaryDetails = false;
    this.getTotalDonationSummary();
  }

  open(content: TemplateRef<any>, addDialog = false) {

    this.modalService.open(content, { size: 'xl', scrollable: true }).result.then(
      (result) => {
        this.closeResult.set(`Closed with: ${result}`);
      },
      (reason) => {
        this.closeResult.set(`Dismissed ${this.getDismissReason(reason)}`);
      },
    );
  }

  viewYearwiseSummary(year: any, month: any = null, filter?: string, date?: string) {
    if (year !== this.selectedDonarYear || month !== this.selectedDonarMonth || filter) {
      this.selectedDonarYear = year;
      this.selectedDonarMonth = month;

      this.expandSummaryDetails = true;
      this.loadingTransactions = true;
      this.memberDataService.getDonationData(year, month, filter, date).subscribe(data => {
        this.transactions = data;
        this.applySort();
        let dialogElement: HTMLElement | null = document.querySelector('.modal-content');
        if (dialogElement) dialogElement.style.overflow = 'auto';
        this.loadingTransactions = false;
      });
    } else {
      this.expandSummaryDetails = !this.expandSummaryDetails;
    }

  }


  private getDismissReason(reason: any): string {
    switch (reason) {
      case ModalDismissReasons.ESC:
        return 'by pressing ESC';
      case ModalDismissReasons.BACKDROP_CLICK:
        return 'by clicking on a backdrop';
      default:
        return `with: ${reason}`;
    }
  }

  onMemberPage() {
    this.router.navigate(['/member']);
  }

  async generateSlip() {
    const req = this.memberForm?.getRawValue();
    this.downloadSlip(req, 'Donation slip generated successfully!');
  }

  downloadSlip(req: any, message, generateOnly = true) {
    this.loading = true;
    this.memberDataService.depositeAmount({ ...req, generateOnly: generateOnly })
      .pipe(
        tap((response: Blob) => {
          this.toastService.show({ template: message, classname: 'bg-success text-light', delay: 5000 });
          this.loading = false;
        }),
      ).subscribe(
        (response: Blob) => {
          const blob = new Blob([response], { type: 'image/jpeg' }); // or other file type
          const url = window.URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = `${req.name}.jpg`; // 📝 your custom filename here
          document.body.appendChild(a);
          a.click();

          // Cleanup
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        (error) => {
          console.error('Download error:', error);
        }
      );
  }

  onPaymentTypeChange(event: any) {
    const paymentType = event?.target?.value || this.memberForm?.get('paymentType')?.value;
    if (paymentType === 'રોકડા') {
      this.memberForm?.get('paymentNo')?.setValue(null);
      this.memberForm?.get('paymentNo')?.disable();
    }
    else {
      this.memberForm?.get('paymentNo')?.enable();
    }
  }

  searchMember() {
    const memberId = this.memberForm?.get('memberId')?.value;
    if (!memberId) {
      this.toastService.show({ template: 'Please enter Member ID', classname: 'bg-warning text-dark', delay: 3000 });
      return;
    }

    this.searchingMember = true;
    this.memberDataService.getMemberByMemberId(memberId).subscribe({
      next: (data) => {
        if (data) {
          this.memberForm?.patchValue({
            name: data.Name,
            city: data.City,
            mobile: data.Mobile
          });
          this.toastService.show({ template: 'Member details fetched successfully!', classname: 'bg-success text-light', delay: 3000 });
        } else {
          this.onReset();
          this.memberForm?.patchValue({ memberId: memberId });
          this.toastService.show({ template: 'Member not found', classname: 'bg-warning text-dark', delay: 3000 });
        }
        this.searchingMember = false;
      },
      error: (err) => {
        console.error('Error fetching member:', err);
        this.onReset();
        this.memberForm?.patchValue({ memberId: memberId });
        this.toastService.show({ template: 'Error fetching member details', classname: 'bg-danger text-light', delay: 3000 });
        this.searchingMember = false;
      }
    });
  }
}
