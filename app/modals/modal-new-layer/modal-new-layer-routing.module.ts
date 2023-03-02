import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalNewLayerPage } from './modal-new-layer.page';

const routes: Routes = [
  {
    path: '',
    component: ModalNewLayerPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalNewLayerPageRoutingModule {}
