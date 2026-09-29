import { MemberService } from '~/services/member.service';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { sessionPeriod } from '~/services/constant';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  constructor(private router: Router, private memberService: MemberService) { }

  invalidCredential = false;
  isLoading = false;
  pinEntered = '';

  async ngOnInit() {
    // Get the token from localStorage (or wherever it's stored)
    const sessionTimeout = localStorage.getItem('session-timeout');
    const minutesDiff = moment().diff(moment(sessionTimeout), "minutes");

    if (!sessionTimeout || minutesDiff > sessionPeriod) {
      localStorage.removeItem('session-timeout');
      localStorage.removeItem('user-role');
      this.isLoading = false;
    }
    else {
      this.router.navigate(['/member']);  // Adjust the route path to your needs
    }
  }

  onSubmit() {
    if (!this.pinEntered || this.pinEntered.length < 4) return;
    
    this.invalidCredential = false;
    this.isLoading = true;

    this.memberService.getAppPin().subscribe({
      next: (res) => {
        this.isLoading = false;
        let role: string | null = null;

        if (res) {
          if (this.pinEntered === res.admin?.toString()) {
            role = 'admin';
          } else if (this.pinEntered === res.viewMembers?.toString()) {
            role = 'viewMembers';
          } else if (this.pinEntered === res.donationInvoice?.toString()) {
            role = 'donationInvoice';
          } else if (this.pinEntered === res.viewOnly?.toString()) {
            role = 'onlyView';
          } else if (this.pinEntered === res.pin?.toString()) {
            // Fallback for single PIN logic
            role = 'admin';
          }
        }

        if (role) {
          localStorage.setItem("session-timeout", Date().toString());
          localStorage.setItem("user-role", role);
          this.router.navigate(['/member']);
        } else {
          this.invalidCredential = true;
          this.pinEntered = '';
        }
      },
      error: () => {
        this.isLoading = false;
        // Fallback to default if API fails
        if (this.pinEntered === '1234') {
          localStorage.setItem("session-timeout", Date().toString());
          localStorage.setItem("user-role", 'admin');
          this.router.navigate(['/member']);
        } else {
          this.invalidCredential = true;
          this.pinEntered = '';
        }
      }
    });
  }
}
