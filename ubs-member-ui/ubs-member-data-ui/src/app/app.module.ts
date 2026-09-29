import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule, } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AsyncPipe, DecimalPipe, LocationStrategy, PathLocationStrategy } from '@angular/common';

// PrimeNG Components for demos
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Print Service
import { NgxPrintModule } from 'ngx-print';
import { RouterModule, RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { LoginComponent } from './components/login/login.component';
import { AuthInterceptor } from './interceptor/http-interceptor';
import { MembersModule } from './modules/members/members.module';
import { MenuComponent } from './components/common/app-family-node/menu/menu.component';
import { ToastsContainer } from './components/common/toasts-container.component';

// Application navigation services

@NgModule({
    imports: [
        MembersModule,
        RouterModule,
        RouterOutlet,
        BrowserModule,
        FormsModule,
        AppRoutingModule,
        HttpClientModule,
        BrowserAnimationsModule,
        NgxPrintModule,
        NgbModule,
        ReactiveFormsModule,
    ],
    declarations: [AppComponent, LoginComponent, MenuComponent, ToastsContainer],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,  // Register the AuthInterceptor
            multi: true  // Set multi to true to allow multiple interceptors
        },
        {
            provide: LocationStrategy,
            useClass: PathLocationStrategy,
        },
        DecimalPipe,
        AsyncPipe,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    bootstrap: [AppComponent], //, MsalRedirectComponent],
})
export class AppModule { }
