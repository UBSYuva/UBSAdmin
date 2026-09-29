import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {

  userRole = 'admin';
  activeMenu = 'members';

  constructor(
    private router: Router,
  ) { }

  ngOnInit() {
    this.userRole = localStorage.getItem('user-role') || 'admin';
  }

  onSignout() {
    localStorage.removeItem('session-timeout');
    localStorage.removeItem('user-role');
    this.router.navigate(['/']);
  }

  haveAccess(type: string): boolean {
    if (this.userRole === 'admin') return true;
    if (type === 'family') return false; // Only admin gets here if above isn't true
    if ((this.userRole === 'viewMembers' || this.userRole === 'onlyView') && (type === 'members' || type === 'shubhechhak' || type === 'report')) return true;
    if (this.userRole === 'donationInvoice' && (type === 'donation' || type === 'donation-summary')) return true;
    return false;
  }

  onMenuBtnClick(type) {
    if (type === 'donation'){
      this.activeMenu = 'donation';
      this.router.navigate(['/mng-donation']);
    }
    else if (type === 'members'){
      this.activeMenu = 'members';
      this.router.navigate(['/member']);
    }
    else if (type === 'shubhechhak') {
      this.activeMenu = 'shubhechhak';
      this.router.navigate(['/s-member']);
    }
    else if (type === 'donation-summary') {
      this.activeMenu = 'donation-summary';
      this.router.navigate(['/donation-summary']);
    }
    else if (type === 'report') {
      this.activeMenu = 'report';
      this.router.navigate(['/reports']);
    }
  }

}
