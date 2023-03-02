import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalNewProjectPageRoutingModule } from './modal-new-project-routing.module';

import { ModalNewProjectPage } from './modal-new-project.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalNewProjectPageRoutingModule
  ],
  declarations: [ModalNewProjectPage]
})
export class ModalNewProjectPageModule {}
