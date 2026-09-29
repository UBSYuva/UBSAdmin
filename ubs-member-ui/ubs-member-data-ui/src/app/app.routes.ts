import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: 'members', loadChildren: () => import('./modules/members/members.module').then(m => m.MembersModule) },
    { path: 's-members', loadChildren: () => import('./modules/members/members.module').then(m => m.MembersModule) },
    { path: 'donation-summary', loadChildren: () => import('./modules/members/members.module').then(m => m.MembersModule) },
    { path: 'mng-donation', loadChildren: () => import('./modules/members/members.module').then(m => m.MembersModule) },
    { path: 'family-tree', loadChildren: () => import('./modules/members/members.module').then(m => m.MembersModule) },
    { path: '**', redirectTo: 'login' } // Redirect to users module if no route is found
];

