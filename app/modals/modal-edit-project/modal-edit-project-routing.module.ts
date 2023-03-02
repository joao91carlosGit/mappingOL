import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalEditProjectPage } from './modal-edit-project.page';

const routes: Routes = [
  {
    path: '',
    component: ModalEditProjectPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalEditProjectPageRoutingModule {}
