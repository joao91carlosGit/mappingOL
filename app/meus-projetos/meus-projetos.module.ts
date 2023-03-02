import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MeusProjetosPageRoutingModule } from './meus-projetos-routing.module';

import { MeusProjetosPage } from './meus-projetos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MeusProjetosPageRoutingModule
  ],
  declarations: [MeusProjetosPage]
})
export class MeusProjetosPageModule {}
