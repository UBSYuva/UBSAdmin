import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MemberDataComponent } from '../../components/member-data/member-data.component';

const routes: Routes = [
  { path: '', component: MemberDataComponent } // Default route for users module
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MembersRoutingModule { }
