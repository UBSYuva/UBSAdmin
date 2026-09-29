import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as moment from 'moment';
import { sessionPeriod } from '~/services/constant';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private router: Router) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Get the token from localStorage (or wherever it's stored)
        const sessionTimeout = localStorage.getItem('session-timeout');
        const minutesDiff = moment().diff(moment(sessionTimeout), "minutes");

        if ((!sessionTimeout || minutesDiff > sessionPeriod) && !req.url.includes('appPin') && this.router.url !== '/') {
            this.router.navigate(['/']);
            localStorage.removeItem('session-timeout');
            localStorage.removeItem('user-role');
        }

        // Clone the request and add the Authorization header if the token exists
        const clonedRequest = req.clone({});

        // Pass the cloned request to the next handler
        return next.handle(clonedRequest);
    }
}
