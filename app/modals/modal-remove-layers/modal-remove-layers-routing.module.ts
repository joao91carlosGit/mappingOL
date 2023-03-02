import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalRemoveLayersPage } from './modal-remove-layers.page';

const routes: Routes = [
  {
    path: '',
    component: ModalRemoveLayersPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalRemoveLayersPageRoutingModule {}
