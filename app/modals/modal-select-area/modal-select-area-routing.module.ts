import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalSelectAreaPage } from './modal-select-area.page';

const routes: Routes = [
  {
    path: '',
    component: ModalSelectAreaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalSelectAreaPageRoutingModule {}
