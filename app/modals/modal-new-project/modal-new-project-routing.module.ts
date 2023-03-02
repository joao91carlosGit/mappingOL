import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalNewProjectPage } from './modal-new-project.page';

const routes: Routes = [
  {
    path: '',
    component: ModalNewProjectPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalNewProjectPageRoutingModule {}
