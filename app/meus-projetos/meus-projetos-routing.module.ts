import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MeusProjetosPage } from './meus-projetos.page';

const routes: Routes = [
  {
    path: '',
    component: MeusProjetosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MeusProjetosPageRoutingModule {}
