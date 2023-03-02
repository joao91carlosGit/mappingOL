import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalEditFeaturesPage } from './modal-edit-features.page';

const routes: Routes = [
  {
    path: '',
    component: ModalEditFeaturesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalEditFeaturesPageRoutingModule {}
